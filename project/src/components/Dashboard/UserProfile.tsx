
import React, { useState, useEffect } from 'react';
import { User, Edit2, Save, Trash2, Plus } from 'lucide-react';
import { apiService } from '../../services/api';
import { User as UserType } from '../../types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dailyStudyGoal: 120,
    preferredTimeSlots: ['14:00'],
    difficultyLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const { user } = await apiService.getCurrentUser();
        setUser(user);
        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          dailyStudyGoal: user.learningPreferences?.dailyStudyGoal || 120,
          preferredTimeSlots: user.learningPreferences?.preferredTimeSlots || ['14:00'],
          difficultyLevel: (user.learningPreferences?.difficultyLevel as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
        });
      } catch (err: any) {
        setError(`Failed to fetch profile: ${err.message}`);
        toast.error(`Failed to fetch profile: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'dailyStudyGoal' ? parseInt(value) : value }));
  };

  const handleTimeSlotChange = (index: number, value: string) => {
    const updatedSlots = [...formData.preferredTimeSlots];
    updatedSlots[index] = value;
    setFormData((prev) => ({ ...prev, preferredTimeSlots: updatedSlots }));
  };

  const addTimeSlot = () => {
    setFormData((prev) => ({ ...prev, preferredTimeSlots: [...prev.preferredTimeSlots, '14:00'] }));
  };

  const removeTimeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      preferredTimeSlots: prev.preferredTimeSlots.filter((_, i) => i !== index),
    }));
  };

  const saveProfile = async () => {
    try {
      setError(null);
      const updates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        learningPreferences: {
          dailyStudyGoal: formData.dailyStudyGoal,
          preferredTimeSlots: formData.preferredTimeSlots,
          difficultyLevel: formData.difficultyLevel,
        }
      };
      const { user } = await apiService.updateProfile(updates);
      setUser(user);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message}`);
      toast.error(`Failed to update profile: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-indigo-900 to-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <User className="h-6 w-6 mr-2" />
          User Profile
        </h1>
        <p className="text-gray-300">Manage your personal information and learning preferences.</p>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-400 text-white px-4 py-3 rounded relative animate-fade-in">
          {error}
          <button onClick={() => setError(null)} className="absolute right-2 top-2 text-white">✕</button>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4">Profile Details</h2>
        {user && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-gray-300">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-gray-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 disabled:opacity-50"
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mt-4">Learning Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300">Daily Study Goal (minutes)</label>
                <input
                  type="number"
                  name="dailyStudyGoal"
                  value={formData.dailyStudyGoal}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-gray-300">Preferred Difficulty</label>
                <select
                  name="difficultyLevel"
                  value={formData.difficultyLevel}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="p-2 border rounded w-full bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-300">Preferred Time Slots</label>
              {formData.preferredTimeSlots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-2 mt-2">
                  <input
                    type="time"
                    value={slot}
                    onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                    disabled={!isEditing}
                    className="p-2 border rounded w-full bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                  />
                  {isEditing && formData.preferredTimeSlots.length > 1 && (
                    <button
                      onClick={() => removeTimeSlot(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <button
                  onClick={addTimeSlot}
                  className="mt-2 text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="h-4 w-4 inline mr-1" /> Add Time Slot
                </button>
              )}
            </div>
            <div className="mt-4">
              {isEditing ? (
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600"
                >
                  <Save className="h-4 w-4 inline mr-1" /> Save
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600"
                >
                  <Edit2 className="h-4 w-4 inline mr-1" /> Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
