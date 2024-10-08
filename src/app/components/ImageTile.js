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
  groups = [],
  setGroups,
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
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const isTitleEmpty = title.trim() === "";
  const isStoreUrlEmpty = storeUrl.trim() === "";

  const imageRef = useRef(null);

  const [updateKey, setUpdateKey] = useState(0);

// Function to force a re-render
const forceUpdate = () => setUpdateKey((prevKey) => prevKey + 1);


  const rgbToHex = (rgb) => {
    const [r, g, b] = rgb;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase()}`;
  };

  useEffect(() => {
    // Ensure groups are loaded and the component is ready
    if (groups && groups.length > 0) {
      // Find the matching group for the current art piece
      const matchedGroup = groups.find(
        (group) =>
          group.artist_work_id === existingId && group.group_name !== "All"
      );

      // Set the selected group if a match is found
      if (matchedGroup) {
        setSelectedGroup(matchedGroup.group_name);
      } else {
        // Fallback to the default group (All) if no custom group is found
        const defaultGroup = groups.find(
          (group) =>
            group.artist_work_id === existingId && group.group_name === "All"
        );
        if (defaultGroup) {
          setSelectedGroup(defaultGroup.group_name);
        }
      }
    }
  }, [groups, existingId]);

  useEffect(() => {
    if (selectedGroup) {
      // Perform necessary actions, such as re-fetching data or updating the UI
      console.log(`Selected group changed to: ${selectedGroup}`);

      // For example, re-fetch the artwork or data based on the selected group
      // You could use a function like fetchArtworkByGroup(selectedGroup) here
      const fetchArtworkByGroup = async (groupName) => {
        try {
          const { data: artworks, error } = await supabase
            .from("artist_work_group")
            .select("artist_work_id")
            .eq("group_name", groupName)
            .eq("artist_id", artistId);

          if (error) throw error;
          console.log("Artworks in the selected group:", artworks);
          // Update your component's state with the fetched artworks if needed
        } catch (error) {
          console.error("Error fetching artworks by group:", error.message);
        }
      };

      // Call the function when the group changes
      fetchArtworkByGroup(selectedGroup);
    }
  }, [selectedGroup, artistId]);

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

    // Set the selected group based on artist_work_id
    const matchedGroup = groups.find(
      (group) => group.artist_work_id === existingId
    );
    if (matchedGroup) {
      setSelectedGroup(matchedGroup.artist_work_id);
    }

    const img = imageRef.current;
    if (img) {
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        setTimeout(() => {
          try {
            const colorThief = new ColorThief();
            const colors = colorThief.getPalette(img, 6);
            const hexColors = colors.map(rgbToHex);
            setDominantColors(hexColors);
          } catch (colorThiefError) {
            console.error(
              "Error extracting colors with ColorThief:",
              colorThiefError
            );
          }
        }, 500);
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




  
  const handleGroupChange = async (newGroupName, isSelected) => {
    try {
      // Ensure the group exists
      const { data: groupExists, error: groupFetchError } = await supabase
        .from("artist_group")
        .select("group_name")
        .eq("group_name", newGroupName)
        .eq("user_id", artistId)
        .single();
  
      if (groupFetchError || !groupExists) {
        console.error("Group does not exist or error fetching group:", groupFetchError?.message);
        return;
      }
  
      // Check if the art is already part of the group
      const { data: groupRelation, error: groupRelationError } = await supabase
        .from("vw_selected_work_groups")
        .select("is_selected")
        .eq("artist_work_id", existingId)
        .eq("group_name", newGroupName)
        .single();
  
      if (groupRelationError) {
        console.error("Error fetching group relation:", groupRelationError.message);
        return;
      }
  
      // Toggle membership
      if (groupRelation?.is_selected) {
        const { error: deleteError } = await supabase
          .from("artist_work_group")
          .delete()
          .eq("artist_work_id", existingId)
          .eq("group_name", newGroupName)
          .eq("artist_id", artistId);
  
        if (deleteError) {
          console.error("Error removing art from group:", deleteError.message);
        } else {
          console.log("Art removed from group successfully");
        }
      } else {
        const { error: insertError } = await supabase
          .from("artist_work_group")
          .insert({
            artist_work_id: existingId,
            group_name: newGroupName,
            artist_id: artistId,
          });
  
        if (insertError) {
          console.error("Error adding art to group:", insertError.message);
        } else {
          console.log("Art added to group successfully");
        }
      }
  
      // Fetch updated groups
      const { data: updatedGroups, error: fetchGroupsError } = await supabase
        .from("vw_selected_work_groups")
        .select("group_name, is_selected")
        .eq("artist_work_id", existingId);
  
      if (fetchGroupsError) {
        console.error("Error fetching updated groups from view:", fetchGroupsError.message);
        return;
      }
  
      console.log("Updated groups from view:", updatedGroups);
  
      // Update groups state
   // Update groups state
   setGroups(updatedGroups);
   forceUpdate(); // Trigger re-render if needed 
  
      // Update selected group
      setSelectedGroup(newGroupName);
    } catch (error) {
      console.error("Error handling group change:", error.message);
    }
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
        const smallFileName = originalFileName.replace(".png", "_small.png");

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
      }

      // 6. Perform upsert operation
      const { data: upsertedRow, error: upsertError } = await supabase
        .from("artist_work")
        .upsert({
          ...upsertData,
          id: existingRow ? existingRow.id : undefined,
        })
        .select();

      if (upsertError) throw upsertError;

      // Fetch the ID of the upserted row
      const rowId = upsertedRow[0]?.id;
      console.log("Row ID:", rowId);

      // Update or set the status message based on whether it's a new or existing row
      if (!existingId) {
        setStatusMessage("Art Work Added");
        existingId = rowId; // Show success message for new artwork
      } else {
        setStatusMessage("Art Work Updated"); // Show success message for updated artwork
      }

      // 7. Update tags in artist_work_tag table
      const tagEntries = Object.keys(tagSelections)
        .map((tagTypeCode) => {
          const selectedTagDescription = tagSelections[tagTypeCode];
          const tagId = availableTags.find(
            (tag) => tag.description === selectedTagDescription
          )?.id;

          if (tagId) {
            return {
              artist_work_id: rowId, // Use the correct row ID here
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

      // 8. Fetch the "All" group ID for the current user based on the user_id column
      const { data: allGroup, error: allGroupError } = await supabase
        .from("artist_group")
        .select("user_id")
        .eq("user_id", artistId) // Match user_id with the artistId
        .eq("group_name", "All")
        .single();

      if (allGroupError) throw allGroupError;

      // 9. Insert the artist_work_id into artist_work_group table under the "All" group
      const { error: groupInsertError } = await supabase
        .from("artist_work_group")
        .upsert({
          artist_work_id: rowId,
          group_name: "All",
          artist_id: artistId,
        });

      if (groupInsertError) {
        console.error(
          "Error inserting into artist_work_group:",
          groupInsertError.message
        );
      } else {
        console.log(
          "Artist work associated with the 'All' group successfully."
        );
      }

      setUnsavedChanges(false); // Reset the unsaved changes state
    } catch (error) {
      console.error("Error uploading image:", error.message || error);
    } finally {
      setLoading(false); // Reset the loading state after the upload is complete
      setTimeout(() => setStatusMessage(""), 3000); // Clear the status message after 3 seconds
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
    if (!newGroupName.trim()) {
      alert("Group name cannot be empty.");
      return;
    }
  
    try {
      // Insert the new group into the artist_group table
      const { data: newGroupData, error: groupError } = await supabase
        .from("artist_group")
        .insert([
          {
            user_id: user.id, // Use the authenticated user's ID
            group_name: newGroupName,
            description: "Custom", // Set the description to "Custom"
            view_order: -1, // Set the view_order to -1 for "Custom" groups
          },
        ])
        .select("*");
  
      if (groupError) {
        console.error("Error adding group:", groupError.message);
        return;
      }
  
      if (newGroupData && newGroupData.length > 0) {
        const newGroup = newGroupData[0];
  
        // Insert into artist_work_group with the newly created group data
        const { error: workGroupError } = await supabase
          .from("artist_work_group")
          .insert([
            {
              artist_id: user.id,
              group_name: newGroup.group_name,
              artist_work_id: existingId, // Use the ID of the current work item
            },
          ]);
  
        if (workGroupError) {
          console.error(
            "Error adding group to artist_work_group:",
            workGroupError.message
          );
          return;
        }
  
        // Add the new group to the existing list of groups
        setGroups((prevGroups) => [
          ...prevGroups,
          ...newGroup, 
        ]);
  
        // Set the newly created group as the selected group
        setSelectedGroup(newGroup.group_name); // Ensure you set the group's name or ID correctly
  
        console.log("Group added successfully:", newGroup);
      }
    } catch (error) {
      console.error("Error adding group:", error.message);
    }
  
    // Clear the input field
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

  const handleDeleteTile = async () => {
    try {
      // Update the is_deleted column to true in the artist_work table
      const { error: workUpdateError } = await supabase
        .from("artist_work")
        .update({ is_deleted: true })
        .eq("id", existingId);

      if (workUpdateError) {
        console.error(
          "Error setting is_deleted to true in artist_work:",
          workUpdateError.message
        );
        return;
      }

      setDeleted(true);

      alert("Art removed successfully!");
    } catch (error) {
      console.error("Error marking tile as deleted:", error.message);
    }
  };

  if (deleted) return null;

  const isSelected = (groupName) => selectedGroup === groupName;

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
          disabled={loading}
          className="upload-button"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      )}
      {statusMessage && (
        <p style={{ color: "green", marginTop: "10px" }}>{statusMessage}</p>
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

    {/* <div className="menu">
        <div className="menu-icon" onClick={toggleMenu}>
            <span className="menu-dot"></span>
            <span className="menu-dot"></span>
            <span className="menu-dot"></span>
        </div>
        {showMenu && (
            <div className="menu-dropdown">
                <ul>
                    {groups
                        .filter((group) => group.group_name !== "All")
                        .map((group) => (
                            <li
                                key={group.group_name}
                                onClick={() => handleGroupChange(group.group_name, group.is_selected)}
                                className={group.is_selected || selectedGroup === group.group_name ? "selected-group" : ""}
                            >
                                {group.group_name}
                            </li>
                        ))}
                </ul>

                <div className="add-group">
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="New group name"
                        className="input-field"
                    />
                    <button onClick={addNewGroup}>+</button>
                </div>
            </div>
        )}
    </div> */}

      <div
        className="remove-btn"
        style={{ backgroundColor: unsavedChanges ? "#85815f" : "#333" }}
      >
        <button className="remove-button" onClick={handleDeleteTile}>
          &times;
        </button>
      </div>
    </div>
  );
};

export default ImageTile;
