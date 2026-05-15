import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, fileApi, getUserErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import Navbar from '../components/layout/Navbar';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    setUploadingAvatar(true);
    const toastId = toast.loading('Uploading avatar...');
    try {
      const res = await fileApi.uploadAvatar(file);
      setUser(res.data.user);
      toast.success('Avatar updated!', { id: toastId });
    } catch (err: any) {
      toast.error(getUserErrorMessage(err, 'Failed to upload avatar.'), { id: toastId });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.updateProfile({ display_name: displayName, bio });
      setUser(res.data);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(getUserErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <Navbar hideOnDesktop />
      <DesktopSidebar />
      <main className="profile-main">
        <div className="mobile-back-container">
          <Button 
            variant="ghost" 
            size="sm" 
            icon="fa-solid fa-arrow-left" 
            onClick={() => navigate('/feed')}
          >
            Back
          </Button>
        </div>
        <div className="profile-page__card">
          <div className="profile-page__header">
            <h1 className="profile-page__title">Account Settings</h1>
            <p className="profile-page__sub">Manage your profile and account preferences.</p>
          </div>

          <div className="profile-page__avatar-section">
            <div 
              className={`profile-page__avatar-container ${uploadingAvatar ? 'profile-page__avatar-container--uploading' : ''}`}
              onClick={handleAvatarClick}
              title="Click to change avatar"
            >
              <img src={user.avatar_url} alt={user.display_name || user.username} />
              <div className="profile-page__avatar-overlay">
                <i className="fa-solid fa-camera" />
              </div>
              {uploadingAvatar && (
                <div className="profile-page__avatar-loader">
                  <i className="fa-solid fa-circle-notch fa-spin" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              style={{ display: 'none' }} 
              accept="image/*" 
            />
            <div className="profile-page__avatar-info">
              <h3>Profile Picture</h3>
              <p>JPG, PNG or WebP. Max 8MB.</p>
              <Button variant="ghost" size="sm" onClick={handleAvatarClick} disabled={uploadingAvatar}>
                Change Picture
              </Button>
            </div>
          </div>

          <form className="profile-page__form" onSubmit={handleSubmit}>
            <div className="profile-page__field-group">
              <label>Email Address</label>
              <div className="profile-page__readonly-field">
                <i className="fa-solid fa-envelope" />
                <span>{user.email}</span>
              </div>
            </div>

            <Input
              label="Display Name"
              icon="fa-solid fa-user"
              type="text"
              placeholder="How should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <div className="profile-page__field-group">
              <label>Bio (Optional)</label>
              <textarea
                className="profile-page__textarea"
                placeholder="A little bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <div className="profile-page__actions">
              <Button type="submit" variant="primary" loading={loading} icon="fa-solid fa-check">
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        <div className="profile-page__card" style={{ marginTop: '24px' }}>
          <div className="profile-page__header">
            <h2 className="profile-page__title">Preferences</h2>
            <p className="profile-page__sub">Customize your cnote experience.</p>
          </div>
          <div className="profile-page__field-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <label style={{ margin: 0 }}>Theme Preference</label>
            <ThemeToggle />
          </div>
        </div>
      </main>
    </div>
  );
}
