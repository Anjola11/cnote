import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, getUserErrorMessage } from '../services/api';
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

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
    }
  }, [user]);

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
