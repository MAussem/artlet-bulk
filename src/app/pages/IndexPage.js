// "use client";
// import React, { useState } from 'react';
// import { createClient } from '@supabase/supabase-js';
// import ImageUpload from '../components/ImageUpload';
// import ImageTile from '../components/ImageTile';
// import Login from './pages/Login';

// const supabaseUrl = 'https://cbawuudpsscpblpbfzsi.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiYXd1dWRwc3NjcGJscGJmenNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY1OTE2MTksImV4cCI6MjAyMjE2NzYxOX0.81B_uqxRgjbWwDCZTmEq1521BdM8Mp5bgLl1RMBemvk';
// const supabase = createClient(supabaseUrl, supabaseKey);

// const IndexPage = () => {
//   const [imageTiles, setImageTiles] = useState([]);
//   const [uploading, setUploading] = useState(false);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState(null);

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     try {
//       const { user, error } = await supabase.auth.signIn({ email, password });
//       if (error) {
//         throw error;
//       }
//       console.log('User logged in:', user);
//       // Redirect to upload page or perform other actions upon successful login
//     } catch (error) {
//       setError(error.message);
//     }
//   };

//   const handleFileSelect = (event) => {
//       const files = event.target.files;
//       const newTiles = [];
//       for (const file of files) {
//           const reader = new FileReader();
//           reader.onload = function (e) {
//               newTiles.push({ imageUrl: e.target.result, file });
//               if (newTiles.length === files.length) {
//                   setImageTiles([...imageTiles, ...newTiles]);
//               }
//           };
//           reader.readAsDataURL(file);
//       }
//   }

//   const handleUpload = async () => {
//       setUploading(true);
//       for (const tile of imageTiles) {
//           const { data, error } = await supabase.storage.from('images').upload(tile.file.name, tile.file);
//           if (error) {
//               console.error('Error uploading image:', error.message);
//           } else {
//               console.log('Image uploaded successfully:', data.Key);
//               // You can save the image URL and other details to the database here
//           }
//       }
//       setUploading(false);
//   }

//   return (
//       <div>
//           <header>
//               <h1>Artlet - Bulk Image Upload</h1>
//           </header>
//           <main>
//           <form onSubmit={handleLogin}>
//           <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
//           <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
//           <button type="submit">Login</button>
//         </form>
//               <ImageUpload handleFileSelect={handleFileSelect} />
//               <section id="imageTiles">
//                   <h2>Image Tiles</h2>
//                   <div id="tilesContainer">
//                       {imageTiles.map((tile, index) => (
//                           <ImageTile key={index} imageUrl={tile.imageUrl} />
//                       ))}
//                   </div>
//               </section>
//               <button onClick={handleUpload} disabled={imageTiles.length === 0 || uploading}>
//                   {uploading ? 'Uploading...' : 'Upload to Artlet'}
//               </button>
//           </main>
//       </div>
//   );
// }

// export default IndexPage;