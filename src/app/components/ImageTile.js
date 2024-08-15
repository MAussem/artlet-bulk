import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import ColorThief from 'color-thief-browser';
import supabase from '../lib/supabase';

Modal.setAppElement('#__next');

const ImageTile = ({
  imageUrl,
  title: initialTitle = '',
  storeUrl: initialStoreUrl = '',
  dimensions: initialDimensions = { height: '', width: '', depth: '' },
  dominantColors: initialDominantColors = [],
  multipleSizes: initialMultipleSizes = false,
  price: initialPrice = 0,
  multiplePrices: initialMultiplePrices = false,
  tags,
  availableTags,
  groups,
  onUpdate,
  hasUnsavedChanges,
  artistId,
  user
}) => {

  const defaultTagSelections = {
    Medium: "Please select from dropdown",
    Movement: "Please select from dropdown",
    Region: "Please select from dropdown",
    Subject: "Please select from dropdown",
    Theme: "Please select from dropdown"
  };

  const [title, setTitle] = useState(initialTitle);
  const [storeUrl, setStoreUrl] = useState(initialStoreUrl);
  const [multipleSizes, setMultipleSizes] = useState(initialMultipleSizes);
  const [price, setPrice] = useState(initialPrice);
  const [multiplePrices, setMultiplePrices] = useState(initialMultiplePrices);
  const [dimensions, setDimensions] = useState(initialDimensions);
  const [tagSelections, setTagSelections] = useState(
    (tags || []).reduce((acc, tag) => {
      acc[tag.tagTypeCode] = tag.description;
      return acc;
    }, defaultTagSelections)
  );
  const [newGroupName, setNewGroupName] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [dominantColors, setDominantColors] = useState(initialDominantColors || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalWidth, setModalWidth] = useState('auto');
  const [modalHeight, setModalHeight] = useState('auto');
  const [conditionalPrice, setConditionalPrice] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState({ title: '', storeUrl: '' });
  
  const isTitleEmpty = title.trim() === '';
  const isStoreUrlEmpty = storeUrl.trim() === '';

  const imageRef = useRef(null);

  useEffect(() => {
    console.log("artist_id:", artistId);
    setTitle(initialTitle);
    setStoreUrl(initialStoreUrl);
    setMultipleSizes(initialMultipleSizes);
    setPrice(initialPrice);
    setMultiplePrices(initialMultiplePrices);
    setDimensions(initialDimensions);
    setTagSelections(
      (tags || []).reduce((acc, tag) => {
        acc[tag.tagTypeCode] = tag.description;
        return acc;
      }, defaultTagSelections)
    );
    setDominantColors(initialDominantColors || []);
  
    const img = imageRef.current;
    if (img) {
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        setTimeout(() => {
          try {
            const colorThief = new ColorThief();
            const colors = colorThief.getPalette(img, 6);
            setDominantColors(colors.map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]})`));
          } catch (colorThiefError) {
            console.error("Error extracting colors with ColorThief:", colorThiefError);
          }
        }, 500); // Adjust delay if needed
      };
      img.onerror = (error) => {
        console.error("Image failed to load:", error);
      };
      img.src = imageUrl;
    }
  
    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [imageUrl]);
  
  useEffect(() => {
    if (isModalOpen && imageRef.current) {
      const img = imageRef.current;
      const { width, height } = img.getBoundingClientRect();
      setModalWidth(width + 40);
      setModalHeight(height + 40);
    }
  }, [isModalOpen, imageUrl]);

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setUnsavedChanges(true);
    setErrors(prevErrors => ({ ...prevErrors, title: event.target.value.trim() === '' ? 'Title is required.' : '' }));
  };

  const handleStoreUrlChange = (event) => {
    setStoreUrl(event.target.value);
    setUnsavedChanges(true);
    setErrors(prevErrors => ({ ...prevErrors, storeUrl: event.target.value.trim() === '' ? 'Store URL is required.' : '' }));
  };

  const toggleMultipleSizes = () => {
    setMultipleSizes(!multipleSizes);
    setUnsavedChanges(true);
  };

  const toggleMultiplePrices = () => {
    setMultiplePrices(!multiplePrices);
    setUnsavedChanges(true);
  };

  const handleDimensionChange = (dimension, event) => {
    setDimensions(prevDimensions => ({
      ...prevDimensions,
      [dimension]: event.target.value,
    }));
    setUnsavedChanges(true);
  };

  const handleTagChange = (tagTypeCode, event) => {
    const newDescription = event.target.value;
    setTagSelections((prevSelections) => ({
      ...prevSelections,
      [tagTypeCode]: newDescription,
    }));
    setUnsavedChanges(true);
  };

  const handleNewGroupNameChange = (event) => {
    setNewGroupName(event.target.value);
    setUnsavedChanges(true);
  };
  
  const handleImageUpload = async () => {
    if (!validateFields()) {
      // If validation fails, stop the upload process
      return;
    }
  
    if (!imageUrl) {
      console.error("No image URL provided for upload");
      return;
    }
  
    try {
      // Fetch the full-size image
      const imageBlob = await fetch(imageUrl).then(res => res.blob());
  
      // Resize the image to 100px width
      const img = new Image();
      img.src = URL.createObjectURL(imageBlob);
      await new Promise((resolve) => img.onload = resolve);
  
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 100;
      const height = (img.height / img.width) * width;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
  
      // Convert resized image to blob
      const resizedBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const resizedFileName = `${Date.now()}_100.png`;
  
      // Upload resized image to Supabase
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('content/gallery')
        .upload(resizedFileName, resizedBlob, {
          cacheControl: '3600',
          upsert: true
        });
  
      if (uploadError) throw uploadError;
  
      // Update image attributes in your database
      const { data: imageData, error: updateError } = await supabase
        .from('artist_work')
        .upsert({
          title,
          work_url: storeUrl,
          dimensions: {
            height: img.height,
            width: img.width,
            depth: dimensions.depth 
          },
          image_url: imageUrl, // Full-size image URL
          multiple_dimensions: multipleSizes, // Adjust as needed
          dc1: dominantColors[0] || null,
          dc2: dominantColors[1] || null,
          dc3: dominantColors[2] || null,
          dc4: dominantColors[3] || null,
          dc5: dominantColors[4] || null,
          dc6: dominantColors[5] || null,
          price,
          multiple_prices: multiplePrices,
          artist_id: artistId
        })
        .single();
        console.log('artistIdLate:', artistId);
        if (updateError) {
          console.error('Error updating image:', updateError.message);
          return; // Exit early if there was an error
        }
  
  
      // // Get the inserted/updated image ID
      // const imageId = imageData.id;
  
      // // Insert tags into artist_work_tag table
      // const tagEntries = Object.keys(tagSelections).map(tagTypeCode => {
      //   const tagDescription = tagSelections[tagTypeCode];
      //   const tag = availableTags.find(t => t.description === tagDescription);
      //   if (tag) {
      //     return {
      //       artist_work_id: imageId,
      //       tag_id: tag
      //     };
      //   }
      //   return null;
      // }).filter(entry => entry !== null);
  
      // if (tagEntries.length > 0) {
      //   const { error: tagInsertError } = await supabase
      //     .from('artist_work_tag')
      //     .insert(tagEntries);
  
      //   if (tagInsertError) {
      //     console.error('Error inserting tags:', tagInsertError.message);
      //   }
      // }
  
      alert('Image uploaded successfully!');
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Error uploading image:', error.message);
    }
  };
  
  

  const validateFields = () => {
    const newErrors = { title: '', storeUrl: '' };
    let isValid = true;
  
    if (!title) {
      newErrors.title = 'Title is required.';
      isValid = false;
    }
  
    if (!storeUrl) {
      newErrors.storeUrl = 'Store URL is required.';
      isValid = false;
    }
  
    setErrors(newErrors);
    return isValid;
  };
  

  const addNewGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('artist_group')
        .insert([{ description: newGroupName }]);
      if (error) {
        console.error('Error adding group:', error.message);
      } else {
        console.log('Group added successfully:', data);
      }
    } catch (error) {
      console.error('Error adding group:', error.message);
    }
    setNewGroupName('');
  };

  const getTagDescriptions = (tagTypeCode) => {
    if (!availableTags || availableTags.length === 0) return ["Please select from dropdown"];
    return ["Please select from dropdown", ...availableTags
      .filter(tag => tag.tag_type_code === tagTypeCode)
      .map(tag => tag.description)];
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalWidth('auto');
    setModalHeight('auto');
  };

  useEffect(() => {
    if (onUpdate) {
      onUpdate({
        title,
        storeUrl,
        dimensions,
        dominantColors,
        multipleSizes,
        price,
        multiplePrices,
        tagSelections
      });
    }
  }, [title, storeUrl, dimensions, dominantColors, multipleSizes, price, multiplePrices, tagSelections]);
  

  return (
    <div className="tile" style={{ backgroundColor: unsavedChanges ? '#85815f' : '#333' }}>
      <img
        src={imageUrl}
        alt="Uploaded Image"
        ref={imageRef}
        onClick={openModal}
        style={{ cursor: 'pointer' }}
      />
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Image Modal"
        className="modal"
        overlayClassName="overlay"
      >
        <img src={imageUrl} alt="Full Size Image" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </Modal>
      {unsavedChanges && (
  <button
    onClick={handleImageUpload}
    disabled={!title.trim() || !storeUrl.trim()} // Use trim() to ignore whitespace
    className="upload-button"
  >
    Save
  </button>
)}
      <div className="dominant-colors">
        <h3>Dominant Colours</h3>
        <div className="color-squares">
          {dominantColors.map((color, index) => (
            <div
              key={index}
              className="color-square"
              style={{ backgroundColor: color }}
            ></div>
          ))}
        </div>
      </div>
      <label className='label'>Title:</label>
      <input
        type="text"
        value={title}
        className={`input-field ${isTitleEmpty ? 'error' : ''}`}
        onChange={handleTitleChange}
        placeholder="Add the Title of Your Work"
      />
      {isTitleEmpty && (
        <p className="error-message">Title is mandatory</p>
      )}
      
      <label className='label'>Store URL:</label>
      <input
        type="text"
        value={storeUrl}
        className={`input-field ${isStoreUrlEmpty ? 'error' : ''}`}
        onChange={handleStoreUrlChange}
        placeholder="Add Your Store URL"
      />
      {isStoreUrlEmpty && (
          <p className="error-message">Store URL is mandatory</p>
        )}

      <div className="toggle-multiple-sizes">
        <label className="switch">
          <input type="checkbox" checked={multipleSizes} onChange={toggleMultipleSizes} />
          <span className="slider round"></span>
        </label>
        <span className="toggle-label">This work comes in multiple sizes</span>
      </div>
      {!multipleSizes && (
      <div className="dimensions">
        <label>
          Height
          <input
            type="text"
            value={dimensions.height}
            className='input-field'
            onChange={(e) => handleDimensionChange('height', e)}
            placeholder="inches"
            required
          />
        </label>
        <label>
          Width
          <input
            type="text"
            value={dimensions.width}
            className='input-field'
            onChange={(e) => handleDimensionChange('width', e)}
            placeholder="inches"
            required
          />
        </label>
        <label>
          Depth
          <input
            type="text"
            value={dimensions.depth}
            className='input-field'
            onChange={(e) => handleDimensionChange('depth', e)}
            placeholder="inches"
            required
          />
        </label>
      </div>
      )}
      <div className="toggle-multiple-prices">
        <label className="switch">
          <input type="checkbox" checked={multiplePrices} onChange={toggleMultiplePrices} />
          <span className="slider round"></span>
        </label>
        <span className="toggle-label">This work comes in multiple prices</span>
      </div>
      {!multiplePrices && (
        <div className="conditional-price">
          <label className='label'>Price:</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className='input-field'
            placeholder="Enter the price"
          />
        </div>
      )}
      <div className="tags">
        <label className='label'>Tags</label>
        <div className="tags-container">
          {Object.keys(defaultTagSelections).map((tagTypeCode, index) => (
            <div key={index} className="tag-item">
              <label className='label'>{tagTypeCode}:</label>
              <select
                value={tagSelections[tagTypeCode]}
                onChange={(e) => handleTagChange(tagTypeCode, e)}
                className='input-field'
              >
                {getTagDescriptions(tagTypeCode).map((description, index) => (
                  <option key={index} value={description}>
                    {description}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div className="menu">
        <div className="menu-icon" onClick={toggleMenu}>
          <span className="menu-dot"></span>
          <span className="menu-dot"></span>
          <span className="menu-dot"></span>
        </div>
        {showMenu && (
          <div className="menu-dropdown">
            <ul>
              {groups.map((group, index) => (
                <li key={index}>{group.group_name}</li>
              ))}
            </ul>
            <div className="add-group">
              <input
                type="text"
                value={newGroupName}
                onChange={handleNewGroupNameChange}
                placeholder="New group name"
                className="input-field"
              />
              <button onClick={addNewGroup}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageTile;
