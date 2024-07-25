import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const InsightsPage = ({ user, handleLogout, paginatedImageTiles, currentPage, totalPages, handlePageChange, setCurrentView, groups, setGroups }) => {
  const [selectedGroup, setSelectedGroup] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  const [randomProfiles, setRandomProfiles] = useState([]);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchRandomProfiles();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data: groups, error } = await supabase
        .from('artist_group')
        .select('description, id')
        .eq('user_id', user.id);
      if (error) {
        throw error;
      }
      console.log('Fetched groups:', groups);
      setGroups(groups);
    } catch (error) {
      console.error('Error fetching groups:', error.message);
    }
  };

  const fetchRandomProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('profile_img')
        .limit(3)
        .order('random()');
      if (error) {
        throw error;
      }
      setRandomProfiles(profiles);
    } catch (error) {
      console.error('Error fetching random profiles:', error.message);
    }
  };

  const createGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('artist_group')
        .insert([{ description: newGroupName, user_id: user.id }]);
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
    setSelectedGroup({});
  };

  const handleGroupChange = (event, index) => {
    setSelectedGroup(prevState => ({
      ...prevState,
      [index]: event.target.value,
    }));
  };

  return (
    <div>
      <header>
        <h1>Artist Insights + Management</h1>
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
        <section id="insightCards">
          <h2>Artwork Insights</h2>
          <div id="cardsContainer">
            {paginatedImageTiles.map((tile, index) => (
              <div key={index} className="insight-card">
                <div className="content-row">
                  <div className="image-row">
                    <img src={tile.imageUrl} alt={tile.title} className="insight-image" />
                  </div>
                  <div className="insight-details">
                    <h2>{tile.title}</h2>
                    <p>Dimensions: {tile.dimensions.height} x {tile.dimensions.width} x {tile.dimensions.depth}</p>
                    <p>Price: ${tile.price}</p>
                  </div>
                  <div className="checkbox-container">
                    <label>
                      Available
                      <input type="checkbox" checked={tile.active} />
                    </label>
                    <label>
                      Deleted
                      <input type="checkbox" checked={tile.show} />
                    </label>
                  </div>
                  <div className="dropdown-container">
                    <select value={selectedGroup[index] || ''} onChange={(e) => handleGroupChange(e, index)}>
                      <option value="">Select Group</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.description}>
                          {group.description}
                        </option>
                      ))}
                      <option value="create">Create New Group</option>
                    </select>
                    {selectedGroup[index] === 'create' && (
                      <div className="new-group-container">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="New group name"
                        />
                        <button onClick={createGroup}>Create Group</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="stats-row">
                  <div className="stats-header">
                    <span>Active</span>
                    <span>Reach</span>
                    <span>Collected</span>
                    <span>Link Clicks</span>
                  </div>
                  <div className="stats-data">
                    <span># days</span>
                    <span>#</span>
                    <span>#</span>
                    <span>#</span>
                  </div>
                </div>
                <div className="stats-row">
                  <div className="stats-header">
                    <span>Commentary</span>
                    <span>Profile Views</span>
                    <span>Follows</span>
                    <span>Top Profiles</span>
                  </div>
                  <div className="stats-data">
                    <span>0</span>
                    <span>458</span>
                    <span>555</span>
                    <span className="top-profiles">
                      {randomProfiles.map((profile, idx) => (
                        <img key={idx} src={profile.profile_img} alt="Top Profile" className="profile-img-small" />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
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
        </section>
      </main>
    </div>
  );
};

export default InsightsPage;
