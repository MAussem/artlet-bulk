import React, { useState, useEffect, useRef } from "react";
import Modal from "react-modal";
import ColorThief from "color-thief-browser";
import supabase from "../lib/supabase";

Modal.setAppElement("#__next");

const ImageTile = ({
  existingId,
  imageUrl,
  title: initialTitle = "",
  storeUrl: initialStoreUrl = "",
  dimensions: initialDimensions = { height: "", width: "", depth: "" },
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
  user,
}) => {
  const defaultTagSelections = {
    Medium: "Please select from dropdown",
    Movement: "Please select from dropdown",
    Region: "Please select from dropdown",
    Subject: "Please select from dropdown",
    Theme: "Please select from dropdown",
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
  const [newGroupName, setNewGroupName] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [dominantColors, setDominantColors] = useState(
    initialDominantColors || []
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalWidth, setModalWidth] = useState("auto");
  const [modalHeight, setModalHeight] = useState("auto");
  // const [conditionalPrice, setConditionalPrice] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState({ title: "", storeUrl: "" });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  const isTitleEmpty = title.trim() === "";
  const isStoreUrlEmpty = storeUrl.trim() === "";

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
            setDominantColors(
              colors.map(
                (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`
              )
            );
          } catch (colorThiefError) {
            console.error(
              "Error extracting colors with ColorThief:",
              colorThiefError
            );
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

  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setUnsavedChanges(true);
    setErrors((prevErrors) => ({
      ...prevErrors,
      title: event.target.value.trim() === "" ? "Title is required." : "",
    }));
  };

  const handleStoreUrlChange = (event) => {
    setStoreUrl(event.target.value);
    setUnsavedChanges(true);
    setErrors((prevErrors) => ({
      ...prevErrors,
      storeUrl:
        event.target.value.trim() === "" ? "Store URL is required." : "",
    }));
  };

  const toggleMultipleSizes = () => {
    setMultipleSizes(!multipleSizes);
    setUnsavedChanges(true);
  };

  const toggleMultiplePrices = () => {
    setMultiplePrices(!multiplePrices);
    setUnsavedChanges(true);
  };

  const handlePriceChange = (event) => {
    setPrice(event.target.value);
    setUnsavedChanges(true);
  };

  const handleDimensionChange = (dimension, event) => {
    setDimensions((prevDimensions) => ({
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
  const handleImageUpload = async () => {
    setLoading(true);

    console.log("Tile being uploaded:", {
      title,
      storeUrl,
      dimensions,
      dominantColors,
      multipleSizes,
      price,
      multiplePrices,
      artistId,
      existingId,
    });
  
    if (!validateFields()) {
      setLoading(false);
      return; // Stop the upload process if validation fails
    }
  
    if (!imageUrl) {
      // console.error("No image URL provided for upload");
      setLoading(false);
      return;
    }
  
    try {
      // Check if the id exists
      let existingRow = null;
      if (existingId) {
        const { data: rows, error: selectError } = await supabase
          .from("artist_work")
          .select("id, image_url")
          .eq("id", existingId);
  
        if (selectError) throw selectError;
        if (rows.length > 0) {
          existingRow = rows[0];
        }
      }
  
      let needsNewUpload = false;
      let originalFileName = "";
  
      if (!existingRow) {
        // If no existing row, we need to upload a new image
        needsNewUpload = true;
        originalFileName = `${Date.now()}.png`;
      } else {
        // Use the existing image file name
        originalFileName = existingRow.image_url.split("/").pop();
      }
  
      if (needsNewUpload) {
        // 1. Fetch the image data
        const response = await fetch(imageUrl);
        if (!response.ok)
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        const imageBlob = await response.blob();
  
        // 2. Create an image object and resize it to maintain aspect ratio
        const img = new Image();
        img.src = URL.createObjectURL(imageBlob);
        await new Promise((resolve) => (img.onload = resolve));
  
        // Calculate the scaling factor while maintaining the aspect ratio
        const maxDimension = 1536;
        let newWidth = img.width;
        let newHeight = img.height;
  
        if (img.width > maxDimension || img.height > maxDimension) {
          if (img.width > img.height) {
            newWidth = maxDimension;
            newHeight = (img.height / img.width) * maxDimension;
          } else {
            newHeight = maxDimension;
            newWidth = (img.width / img.height) * maxDimension;
          }
        }
  
        // Resize the canvas to the new dimensions
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
  
        // Convert the canvas to a blob for upload
        const resizedBlob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
  
        // 3. Upload the resized image
        const { error: originalUploadError } = await supabase.storage
          .from("content")
          .upload(`gallery/${originalFileName}`, resizedBlob, {
            cacheControl: "3600",
            upsert: true,
          });
  
        if (originalUploadError) throw originalUploadError;
  
        // 4. Resize the image to 100px width and upload
        const smallCanvas = document.createElement("canvas");
        const smallCtx = smallCanvas.getContext("2d");
        const smallWidth = 200;
        const smallHeight = (newHeight / newWidth) * smallWidth;
        smallCanvas.width = smallWidth;
        smallCanvas.height = smallHeight;
        smallCtx.drawImage(img, 0, 0, smallWidth, smallHeight);
  
        const smallBlob = await new Promise((resolve) =>
          smallCanvas.toBlob(resolve, "image/png")
        );
        const smallFileName = `${Date.now()}_small.png`;
  
        const { error: smallUploadError } = await supabase.storage
          .from("content")
          .upload(`gallery/${smallFileName}`, smallBlob, {
            cacheControl: "3600",
            upsert: true,
          });
  
        if (smallUploadError) throw smallUploadError;
      }
  
      // 5. Prepare data for upsert
      const upsertData = {
        title,
        work_url: storeUrl,
        image_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/gallery/${originalFileName}`,
        dc1: dominantColors[0] || null,
        dc2: dominantColors[1] || null,
        dc3: dominantColors[2] || null,
        dc4: dominantColors[3] || null,
        dc5: dominantColors[4] || null,
        dc6: dominantColors[5] || null,
        artist_id: artistId,
      };
  
      // Conditionally update dimensions or multiple_dimensions
      if (multipleSizes) {
        upsertData.multiple_dimensions = true;
        upsertData.dimensions = {
          height: "",
          width: "",
          depth: "",
        };
      } else {
        if (dimensions.height || dimensions.width || dimensions.depth) {
          upsertData.dimensions = {
            height: dimensions.height || "",
            width: dimensions.width || "",
            depth: dimensions.depth || "",
          };
          upsertData.multiple_dimensions = false;
        } else {
          upsertData.dimensions = {
            height: "",
            width: "",
            depth: "",
          };
        }
      }
  
      // Conditionally update price or multiple_prices
      if (multiplePrices) {
        upsertData.multiple_prices = true;
        upsertData.price = price || null;
        upsertData.multiple_prices = false;
      }
  
      // 6. Perform upsert operation
      const { error: upsertError } = await supabase.from("artist_work").upsert({
        ...upsertData,
        id: existingRow ? existingRow.id : undefined,
      });
  
      if (upsertError) throw upsertError;
  
      // 7. Update tags in artist_work_tag table
      const tagEntries = Object.keys(tagSelections)
        .map((tagTypeCode) => {
          const selectedTagDescription = tagSelections[tagTypeCode];
          const tagId = availableTags.find(
            (tag) => tag.description === selectedTagDescription
          )?.id;
  
          if (tagId) {
            return {
              artist_work_id: existingRow ? existingRow.id : upsertData.id,
              tag_id: tagId,
            };
          }
          return null; // Return null if tagId is not found
        })
        .filter((entry) => entry !== null); // Filter out null entries
  
      if (tagEntries.length > 0) {
        const { error: tagInsertError } = await supabase
          .from("artist_work_tag")
          .upsert(tagEntries);
  
        if (tagInsertError) {
          console.error("Error inserting tags:", tagInsertError.message);
        } else {
          console.log("Tags inserted/updated successfully.");
        }
      }
  
      alert("Image uploaded successfully!");
      setUnsavedChanges(false);
    } catch (error) {
      console.error("Error uploading image:", error.message || error);
    } finally {
      setLoading(false); // Reset the loading state after the upload is complete
    }
  };
  

  const validateFields = () => {
    const newErrors = { title: "", storeUrl: "" };
    let isValid = true;

    if (!title) {
      newErrors.title = "Title is required.";
      isValid = false;
    }

    if (!storeUrl) {
      newErrors.storeUrl = "Store URL is required.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const addNewGroup = async () => {
    try {
      const { data, error } = await supabase
        .from("artist_group")
        .insert([{ description: newGroupName }]);
      if (error) {
        console.error("Error adding group:", error.message);
      } else {
        console.log("Group added successfully:", data);
      }
    } catch (error) {
      console.error("Error adding group:", error.message);
    }
    setNewGroupName("");
  };

  const getTagDescriptions = (tagTypeCode) => {
    if (!availableTags || availableTags.length === 0)
      return ["Please select from dropdown"];
    return [
      "Please select from dropdown",
      ...availableTags
        .filter((tag) => tag.tag_type_code === tagTypeCode)
        .map((tag) => tag.description),
    ];
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalWidth("auto");
    setModalHeight("auto");
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
        tagSelections,
      });
    }
  }, [
    title,
    storeUrl,
    dimensions,
    dominantColors,
    multipleSizes,
    price,
    multiplePrices,
    tagSelections,
  ]);

  return (
    <div
      className="tile"
      style={{ backgroundColor: unsavedChanges ? "#85815f" : "#333" }}
    >
      <img
        src={imageUrl}
        alt="Uploaded Image"
        ref={imageRef}
        onClick={openModal}
        style={{ cursor: "pointer" }}
      />
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Image Modal"
        className="modal"
        overlayClassName="overlay"
      >
        <img
          src={imageUrl}
          alt="Full Size Image"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Modal>
      {unsavedChanges && (
        <button
          onClick={handleImageUpload}
          disabled={!title.trim() || !storeUrl.trim()} // Use trim() to ignore whitespace
          className="upload-button"
        >
           {loading ? "Saving..." : "Save"}
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
      <label className="label">Title:</label>
      <input
        type="text"
        value={title}
        className={`input-field ${isTitleEmpty ? "error" : ""}`}
        onChange={handleTitleChange}
        placeholder="Add the Title of Your Work"
      />
      {isTitleEmpty && <p className="error-message">Title is mandatory</p>}

      <label className="label">Store URL:</label>
      <input
        type="text"
        value={storeUrl}
        className={`input-field ${isStoreUrlEmpty ? "error" : ""}`}
        onChange={handleStoreUrlChange}
        placeholder="Add Your Store URL"
      />
      {isStoreUrlEmpty && (
        <p className="error-message">Store URL is mandatory</p>
      )}

      <div className="toggle-multiple-sizes">
        <label className="switch">
          <input
            type="checkbox"
            checked={multipleSizes}
            onChange={toggleMultipleSizes}
          />
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
              className="input-field"
              onChange={(e) => handleDimensionChange("height", e)}
              placeholder="inches"
              required
            />
          </label>
          <label>
            Width
            <input
              type="text"
              value={dimensions.width}
              className="input-field"
              onChange={(e) => handleDimensionChange("width", e)}
              placeholder="inches"
              required
            />
          </label>
          <label>
            Depth
            <input
              type="text"
              value={dimensions.depth}
              className="input-field"
              onChange={(e) => handleDimensionChange("depth", e)}
              placeholder="inches"
              required
            />
          </label>
        </div>
      )}
      <div className="toggle-multiple-prices">
        <label className="switch">
          <input
            type="checkbox"
            checked={multiplePrices}
            onChange={toggleMultiplePrices}
          />
          <span className="slider round"></span>
        </label>
        <span className="toggle-label">This work comes in multiple prices</span>
      </div>
      {!multiplePrices && (
        <div className="conditional-price">
          <label className="label">Price:</label>
          <input
            type="text"
            value={price}
            onChange={(e) => handlePriceChange(e)}
            className="input-field"
            placeholder="Enter the price"
          />
        </div>
      )}
      <div className="tags">
        <label className="label">Tags</label>
        <div className="tags-container">
          {Object.keys(defaultTagSelections).map((tagTypeCode, index) => (
            <div key={index} className="tag-item">
              <label className="label">{tagTypeCode}:</label>
              <select
                value={tagSelections[tagTypeCode]}
                onChange={(e) => handleTagChange(tagTypeCode, e)}
                className="input-field"
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
              {groups.map((group) => (
                <li
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={selectedGroup === group.id ? "selected-group" : ""}
                >
                  {group.group_name}
                </li>
              ))}
            </ul>
            <div className="add-group">
              <input
                type="text"
                value={newGroupName}
                onChange={handleGroupChange}
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
