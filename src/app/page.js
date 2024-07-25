"use client";
import React, { useState, useEffect } from 'react';
import supabase from './lib/supabase';  // Import the updated Supabase client
import ImageUpload from './components/ImageUpload';
import ImageTile from './components/ImageTile';
import InsightsPage from './pages/InsightsPage';

const IndexPage = () => {
  const [imageTiles, setImageTiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentView, setCurrentView] = useState('bulk');
  const itemsPerPage = 5;

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
        dominantColors: image.dominant_colors || [],
        multipleSizes: image.multiple_dimensions || false,
        tags: image.artist_work_tag.map(tagItem => ({
          description: tagItem.tag.description,
          tagTypeCode: tagItem.tag.tag_type_code,
        })),
        reach: image.reach || 0,
        collected: image.collected || 0,
        linkClicks: image.link_clicks || 0,
        profileViews: image.profile_views || 0,
        follows: image.follows || 0,
        topProfiles: image.top_profiles || []
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
        .select('description')
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

  const handleFileSelect = (event) => {
    const files = event.target.files;
    const newTiles = [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = function (e) {
        newTiles.push({ imageUrl: e.target.result, file });
        if (newTiles.length === files.length) {
          setImageTiles([...imageTiles, ...newTiles]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    for (const tile of imageTiles) {
      const { data, error } = await supabase.storage.from('images').upload(tile.file.name, tile.file);
      if (error) {
        console.error('Error uploading image:', error.message);
      } else {
        console.log('Image uploaded successfully:', data.Key);
        // Save image URL and details to the database here
      }
    }
    setUploading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      setUser(null);
    }
  };

  const paginatedImageTiles = imageTiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(imageTiles.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
        paginatedImageTiles={paginatedImageTiles}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePageChange={handlePageChange}
        setCurrentView={setCurrentView}
        groups={groups}
        setGroups={setGroups}
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
        <div className="top-buttons">
          <button onClick={() => setCurrentView('bulk')} className='view-btn'>
            Bulk Upload
          </button>
          <button onClick={() => setCurrentView('insights')} className='view-btn'>
            Insights
          </button>
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
                  key={index}
                  imageUrl={tile.imageUrl}
                  title={tile.title}
                  storeUrl={tile.storeUrl}
                  dimensions={tile.dimensions}
                  dominantColors={tile.dominantColors}
                  multipleSizes={tile.multipleSizes}
                  tags={tile.tags}
                  availableTags={tags}
                  groups={groups}
                />
              ))}
            </div>
            <button onClick={handleUpload} className='upload-btn'>
              {uploading ? 'Uploading...' : 'Upload All'}
            </button>
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
