"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUpload from './components/ImageUpload';
import ImageTile from './components/ImageTile';
import Login from './pages/Login';

const supabaseUrl = 'https://cbawuudpsscpblpbfzsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiYXd1dWRwc3NjcGJscGJmenNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY1OTE2MTksImV4cCI6MjAyMjE2NzYxOX0.81B_uqxRgjbWwDCZTmEq1521BdM8Mp5bgLl1RMBemvk';
const supabase = createClient(supabaseUrl, supabaseKey);

const IndexPage = () => {
  const [imageTiles, setImageTiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error.message);
        return;
      }
      setUser(session?.user ?? null);
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
        .eq('user_id', user.id); // Filter by logged-in user's ID
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
        // You can save the image URL and other details to the database here
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
  } else {
    return (
      <div>
        <header>
          <h1>Artlet - Bulk Image Upload</h1>
        </header>
        <button className='logout-btn' onClick={handleLogout}>
          Logout
        </button>
        <main>
          <ImageUpload handleFileSelect={handleFileSelect} />
          <section id="imageTiles">
            <h2>Image Tiles</h2>
            <div id="tilesContainer">
              {imageTiles.map((tile, index) => (
                <ImageTile
                  key={index}
                  imageUrl={tile.imageUrl}
                  title={tile.title}
                  storeUrl={tile.storeUrl}
                  dimensions={tile.dimensions || { height: '', width: '', depth: '' }}
                  dominantColors={tile.dominantColors}
                  multipleSizes={tile.multipleSizes}
                  tags={tile.tags}
                  availableTags={tags}
                  groups={groups}
                />
              ))}
            </div>
          </section>
          <button onClick={handleUpload} disabled={imageTiles.length === 0 || uploading} className='upload-btn'>
            {uploading ? 'Uploading...' : 'Upload to Artlet'}
          </button>
        </main>
      </div>
    );
  }
};

export default IndexPage;




