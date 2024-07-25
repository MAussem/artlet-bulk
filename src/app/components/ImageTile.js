// components/ImageTile.js
import React, { useState, useEffect, useRef } from 'react';
import ColorThief from 'color-thief-browser';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cbawuudpsscpblpbfzsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiYXd1dWRwc3NjcGJscGJmenNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY1OTE2MTksImV4cCI6MjAyMjE2NzYxOX0.81B_uqxRgjbWwDCZTmEq1521BdM8Mp5bgLl1RMBemvk';
const supabase = createClient(supabaseUrl, supabaseKey);

const ImageTile = ({
  imageUrl,
  title: initialTitle,
  storeUrl: initialStoreUrl,
  dimensions: initialDimensions,
  dominantColors: initialDominantColors,
  multipleSizes: initialMultipleSizes,
  tags,
  availableTags,
  groups
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [storeUrl, setStoreUrl] = useState(initialStoreUrl);
  const [multipleSizes, setMultipleSizes] = useState(initialMultipleSizes);
  const [dimensions, setDimensions] = useState(initialDimensions);
  const [tagSelections, setTagSelections] = useState(
    (availableTags || []).reduce((acc, tag) => {
      if (!acc[tag.tag_type_code]) {
        acc[tag.tag_type_code] = "Please select from dropdown";
      }
      return acc;
    }, {})
  );
  
  const [newGroupName, setNewGroupName] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [dominantColors, setDominantColors] = useState(initialDominantColors || []);
  const imageRef = useRef();

  useEffect(() => {
    if (imageUrl) {
      const img = imageRef.current;
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const colorThief = new ColorThief();
        const colors = colorThief.getPalette(img, 5);
        setDominantColors(colors.map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]})`));
      };
    }
  }, [imageUrl]);

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleStoreUrlChange = (event) => {
    setStoreUrl(event.target.value);
  };

  const toggleMultipleSizes = () => {
    setMultipleSizes(!multipleSizes);
  };

  const handleDimensionChange = (dimension, event) => {
    setDimensions(prevDimensions => ({
      ...prevDimensions,
      [dimension]: event.target.value,
    }));
  };

  const handleTagChange = (tagTypeCode, event) => {
    const newDescription = event.target.value;
    setTagSelections((prevSelections) => ({
      ...prevSelections,
      [tagTypeCode]: newDescription,
    }));
  };

  const handleNewGroupNameChange = (event) => {
    setNewGroupName(event.target.value);
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
        await fetchGroups();
      }
    } catch (error) {
      console.error('Error adding group:', error.message);
    }
    setNewGroupName('');
  };

  const getTagDescriptions = (tagTypeCode) => {
    if (!availableTags) return ["Please select from dropdown"];
    return ["Please select from dropdown", ...availableTags
      .filter(tag => tag.tag_type_code === tagTypeCode)
      .map(tag => tag.description)];
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  return (
    <div className="tile">
      <img src={imageUrl} alt="Uploaded Image" ref={imageRef} />
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
        className='input-field'
        onChange={handleTitleChange}
        placeholder="Add the Title of Your Work"
      />
      <label className='label'>Store URL:</label>
      <input
        type="text"
        value={storeUrl}
        className='input-field'
        onChange={handleStoreUrlChange}
        placeholder="Add Your Store URL"
      />
      <div className="toggle-multiple-sizes">
        <label className="switch">
          <input type="checkbox" checked={multipleSizes} onChange={toggleMultipleSizes} />
          <span className="slider round"></span>
        </label>
        <span className="toggle-label">This work comes in multiple sizes</span>
      </div>
      <div className="dimensions">
        <label>
          Height (inches):
          <input
            type="text"
            value={dimensions.height}
            className='input-field'
            onChange={(e) => handleDimensionChange('height', e)}
            placeholder="Height"
            required
          />
        </label>
        <label>
          Width (inches):
          <input
            type="text"
            value={dimensions.width}
            className='input-field'
            onChange={(e) => handleDimensionChange('width', e)}
            placeholder="Width"
            required
          />
        </label>
        <label>
          Depth (inches):
          <input
            type="text"
            value={dimensions.depth}
            className='input-field'
            onChange={(e) => handleDimensionChange('depth', e)}
            placeholder="Depth"
            required
          />
        </label>
      </div>
      <div className="tags">
        <h4>Tags:</h4>
        <div className="tags-container">
          {Object.keys(tagSelections).map((tagTypeCode, index) => (
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
                <li key={index}>{group.description}</li>
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
