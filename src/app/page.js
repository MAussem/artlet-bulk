"use client";
import React, { useState, useEffect } from 'react';
import supabase from './lib/supabase';  // Import the updated Supabase client
import ImageUpload from './components/ImageUpload';
import ImageTile from './components/ImageTile';
import InsightsPage from './pages/InsightsPage';
import ColorThief from 'color-thief-browser';

const IndexPage = () => {
  const [imageTiles, setImageTiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [artistId, setArtistId] = useState(null); // added this state to store the artist ID for the selected image
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentView, setCurrentView] = useState('bulk');
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error.message);
        return;
      }
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('profile_img')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile image:', profileError.message);
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

  const fetchUserImages = async () => {
    try {
      const { data: images, error } = await supabase
        .from('artist_work')
        .select(`
          *,
          artist_work_tag (
            tag (
              description,
              tag_type_code
            )
          )
        `)
        .eq('artist_id', user.id);
      if (error) {
        throw error;
      }
      const userImages = images.map(image => ({
        imageUrl: image.image_url,
        title: image.title || '',
        storeUrl: image.work_url || '',
        dimensions: image.dimensions || { height: '', width: '', depth: '' },
        dominantColors: [
          image.dc1, image.dc2, image.dc3, image.dc4, image.dc5, image.dc6
        ].filter(Boolean),
        multipleSizes: image.multiple_dimensions || false,
        price: image.price || 0,
        multiplePrices: image.multiple_prices || false,
        tags: image.artist_work_tag.map(tagItem => ({
          description: tagItem.tag.description,
          tagTypeCode: tagItem.tag.tag_type_code,
        })),
        reach: image.reach || 0,
        collected: image.collected || 0,
        linkClicks: image.link_clicks || 0,
        profileViews: image.profile_views || 0,
        follows: image.follows || 0,
        topProfiles: image.top_profiles || [],
        artistId: image.artist_id
      }));
      setImageTiles(userImages);
    } catch (error) {
      console.error('Error fetching user images:', error.message);
    }
  };

  const fetchTags = async () => {
    try {
      const { data: tags, error } = await supabase
        .from('tag')
        .select('*');
      if (error) {
        throw error;
      }
      setTags(tags);
    } catch (error) {
      console.error('Error fetching tags:', error.message);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data: groups, error } = await supabase
        .from('artist_group')
        .select('group_name')
        .eq('user_id', user.id);
      if (error) {
        throw error;
      }
      setGroups(groups);
    } catch (error) {
      console.error('Error fetching groups:', error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  
    console.log('Files selected:', files); // Debugging line
  
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async function (e) {
        console.log('File loaded:', e.target.result); // Debugging line
  
        const fileName = `${Date.now()}.png`;
        const filePath = `gallery/${fileName}`;
  
        try {
          const { data, error: uploadError } = await supabase.storage.from('content').upload(filePath, file);
          if (uploadError) {
            throw uploadError;
          }
  
          const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/${filePath}`;
          console.log('Image URL:', imageUrl); // Debugging line
  
          newTiles.push({
            imageUrl,
            file,
            hasUnsavedChanges: true,
            dominantColors: []
          });
  
          // Update state only once all files are processed
          if (newTiles.length === files.length) {
            setImageTiles(prevTiles => [
              ...newTiles,
              ...prevTiles
            ]);
          }
        } catch (error) {
          console.error('Error uploading image:', error.message);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  
  const rgbToHex = (rgb) => {
    const [r, g, b] = rgb;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  };

//   const handleUpload = async () => {
//   setUploading(true);
//   for (const tile of imageTiles) {
//     if (tile.file) { // Check if tile has a file to upload
//       const filePath = `gallery/${tile.file.name}`; // Adjust path to include folder

//       try {
//         const { data, error } = await supabase.storage.from('content').upload(filePath, tile.file);
//         if (error) {
//           console.error('Error uploading image:', error.message);
//           continue;
//         }

//         console.log('Image uploaded successfully:', data.Key);
//         const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/${filePath}`;
        
//         // Extract dominant colors
//         const img = new Image();
//         img.src = URL.createObjectURL(tile.file);
//         img.onload = () => {
//           setTimeout(() => {
//             try {
//               const colorThief = new ColorThief();
//               const colors = colorThief.getPalette(img, 6).map(rgbToHex);

//               // Save image details to the database
//               saveImageDetails({
//                 imageUrl,
//                 title: tile.title || '',
//                 storeUrl: tile.storeUrl || '',
//                 dominantColors: colors
//               });
//             } catch (colorThiefError) {
//               console.error('Error extracting colors with ColorThief:', colorThiefError);
//             }
//           }, 500); // Adjust delay if needed
//         };
//       } catch (uploadError) {
//         console.error('Unexpected error during upload:', uploadError.message);
//       }
//     }
//   }
//   setUploading(false);
// };

// const saveImageDetails = async ({ imageUrl, title, storeUrl, dominantColors }) => {
//   const [dc1, dc2, dc3, dc4, dc5, dc6] = Array.isArray(dominantColors) ? dominantColors : [];

//   try {
//     const { error } = await supabase
//       .from('artist_work')
//       .insert({
//         image_url: imageUrl,
//         title,
//         work_url: storeUrl,
//         dc1,
//         dc2,
//         dc3,
//         dc4,
//         dc5,
//         dc6,
//       });

//     if (error) {
//       throw error;
//     }

//     console.log('Image details saved successfully.');
//   } catch (error) {
//     console.error('Error saving image details:', error.message);
//   }
// };


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      setUser(null);
    }
  };

  const filteredImageTiles = imageTiles.filter(tile => {
    const title = tile.title || ''; // Default to an empty string if tile.title is undefined
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
    setImageTiles(prevTiles => {
      const newTiles = prevTiles.map(tile =>
        tile.id === id ? { ...tile, ...updatedDetails } : tile  // Use id to find the tile
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
  } else if (currentView === 'insights') {
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
          <button onClick={() => setCurrentView('bulk')} className='view-btn'>
            Bulk Upload
          </button>
          <button onClick={() => setCurrentView('insights')} className='view-btn'>
            Insights
          </button>
        </div>
        <div className="pagination-controls">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              className={index + 1 === currentPage ? 'active' : ''}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button className='logout-btn' onClick={handleLogout}>
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
                  groups={groups}
                  onUpdate={(updatedDetails) => handleImageUpdate(index, updatedDetails)}
                  hasUnsavedChanges={tile.hasUnsavedChanges}
                  user={user}
                  artistId={tile.artistId}
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
                  className={index + 1 === currentPage ? 'active' : ''}
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