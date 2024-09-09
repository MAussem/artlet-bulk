"use client";
import React, { useState, useEffect } from "react";
import supabase from "./lib/supabase"; // Import the updated Supabase client
import ImageUpload from "./components/ImageUpload";
import ImageTile from "./components/ImageTile";
import InsightsPage from "./pages/InsightsPage";
import ColorThief from "color-thief-browser";

const IndexPage = () => {
  const [imageTiles, setImageTiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentView, setCurrentView] = useState("bulk");
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error.message);
        return;
      }
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("profile_img")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error(
            "Error fetching user profile image:",
            profileError.message
          );
          return;
        }

        setUser({ ...session.user, profile_img: profile?.profile_img ?? null });
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserImages();
      fetchTags();
      fetchGroups();
    }
  }, [user]);


  const fetchTags = async () => {
    try {
      const { data: tags, error } = await supabase.from("tag").select("*");
      if (error) {
        throw error;
      }
      setTags(tags);
    } catch (error) {
      console.error("Error fetching tags:", error.message);
    }
  };

  const fetchGroups = async (artistWorkId) => {
    if (!artistWorkId) {
      console.error("artistWorkId is undefined, cannot fetch groups.");
      return []; // Return an empty array if artistWorkId is undefined
    }
  
    try {
      console.log(`Fetching groups for artistWorkId: ${artistWorkId}`);
      const { data: groups, error } = await supabase
        .from("vw_selected_work_groups")
        .select("group_name, is_selected")
        .eq("artist_work_id", artistWorkId);
  
      if (error) {
        throw error;
      }
  
      console.log("Fetched groups:", groups);
      return groups; // Return the fetched groups
    } catch (error) {
      console.error("Error fetching groups:", error.message);
      return []; // Return an empty array if there's an error
    }
  };
  

  const fetchUserImages = async () => {
    try {
      const { data: images, error } = await supabase
        .from("artist_work")
        .select(
          `
          *,
          artist_work_tag (
            tag (
              description,
              tag_type_code
            )
          )
        `
        )
        .eq("artist_id", user.id)
        .eq("is_deleted", false);
  
      if (error) {
        throw error;
      }
  
      const userImages = await Promise.all(
        images.map(async (image) => {
          const groups = await fetchGroups(image.id); // Correctly use image.id
  
          return {
            id: image.id,
            imageUrl: image.image_url,
            title: image.title || "",
            storeUrl: image.work_url || "",
            dimensions: image.dimensions || {
              height: "",
              width: "",
              depth: "",
            },
            dominantColors: [
              image.dc1,
              image.dc2,
              image.dc3,
              image.dc4,
              image.dc5,
              image.dc6,
            ].filter(Boolean),
            multipleSizes: image.multiple_dimensions || false,
            price: image.price || 0,
            multiplePrices: image.multiple_prices || false,
            tags: image.artist_work_tag.map((tagItem) => ({
              description: tagItem.tag.description,
              tagTypeCode: tagItem.tag.tag_type_code,
            })),
            reach: image.reach || 0,
            collected: image.collected || 0,
            linkClicks: image.link_clicks || 0,
            profileViews: image.profile_views || 0,
            follows: image.follows || 0,
            topProfiles: image.top_profiles || [],
            artistId: image.artist_id,
            groups: groups, // Ensure groups are correctly set
          };
        })
      );
  
      console.log('Fetched user images:', userImages);
  
      // Sort the userImages by file name (assuming the file name contains the timestamp)
      userImages.sort((a, b) => {
        const fileNameA = a.imageUrl.split("/").pop(); // Extract file name from URL
        const fileNameB = b.imageUrl.split("/").pop();
        return fileNameB.localeCompare(fileNameA); // Sort descending (newest first)
      });
  
      setImageTiles(userImages);
    } catch (error) {
      console.error("Error fetching user images:", error.message);
    }
  };
  

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      setUser(data.user);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    const newTiles = [];

    console.log("Files selected:", files); // Debugging line

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = function (e) {
        console.log("File loaded:", e.target.result); // Debugging line

        newTiles.push({
          imageUrl: e.target.result, // The data URL of the file
          file,
          hasUnsavedChanges: true,
          dominantColors: [],
          artistId: user.id,
        });

        // Update state once all files are processed
        if (newTiles.length === files.length) {
          setImageTiles((prevTiles) => [...newTiles, ...prevTiles]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      setUser(null);
    }
  };

  const filteredImageTiles = imageTiles.filter((tile) => {
    const title = tile.title || ""; // Default to an empty string if tile.title is undefined
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const paginatedImageTiles = filteredImageTiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredImageTiles.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleImageUpdate = (id, updatedDetails) => {
    setImageTiles((prevTiles) => {
      const newTiles = prevTiles.map(
        (tile) =>
          tile.id === id ? { ...tile, ...updatedDetails, groups } : tile // Use id to find the tile
      );
      return newTiles;
    });
  };

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-form">
          <form onSubmit={handleLogin}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button type="submit">Login</button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    );
  } else if (currentView === "insights") {
    return (
      <InsightsPage
        user={user}
        handleLogout={handleLogout}
        filteredImageTiles={filteredImageTiles}
        paginatedImageTiles={paginatedImageTiles}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePageChange={handlePageChange}
        setCurrentView={setCurrentView}
        groups={groups}
        setGroups={setGroups}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    );
  } else {
    return (
      <div>
        <header>
          <h1>Artlet - Bulk Image Upload</h1>
          <div className="profile-picture">
            <img src={user.profile_img} alt="Profile" className="profile-img" />
          </div>
        </header>
        <div className="search-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title"
          />
        </div>
        <div className="top-buttons">
          <button onClick={() => setCurrentView("bulk")} className="view-btn">
            Bulk Upload
          </button>
          <button
            onClick={() => setCurrentView("insights")}
            className="view-btn"
          >
            Insights
          </button>
        </div>
        <div className="pagination-controls">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              className={index + 1 === currentPage ? "active" : ""}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
        <main>
          <ImageUpload handleFileSelect={handleFileSelect} />
          <section id="imageTiles">
            <h2>Image Tiles</h2>
            <div id="tilesContainer">
              {paginatedImageTiles.map((tile, index) => (
                <ImageTile
                  key={tile.id}
                  imageUrl={tile.imageUrl}
                  title={tile.title}
                  storeUrl={tile.storeUrl}
                  dimensions={tile.dimensions}
                  dominantColors={tile.dominantColors}
                  multipleSizes={tile.multipleSizes}
                  price={tile.price}
                  multiplePrices={tile.multiplePrices}
                  tags={tile.tags}
                  availableTags={tags}
                  groups={tile.groups}
                  setGroups={setGroups}
                  onUpdate={(updatedDetails) =>
                    handleImageUpdate(index, updatedDetails)
                  }
                  hasUnsavedChanges={tile.hasUnsavedChanges}
                  user={user}
                  artistId={tile.artistId}
                  existingId={tile.id}
                  initialGroupId={tile.groupId}
                />
              ))}
            </div>
            {/* <button onClick={handleUpload} className='upload-btn'>
              {uploading ? 'Uploading...' : 'Upload All'}
            </button> */}
            <div className="pagination-controls">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  className={index + 1 === currentPage ? "active" : ""}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }
};

export default IndexPage;
