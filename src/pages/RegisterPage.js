// ✅ Final RegisterPage.js
import React, { useState } from 'react';
import axios from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Employee'
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      alert('Registration successful!');
      navigate('/login');
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700">Create Account</h2>
        <input type="text" name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required className="w-full mb-4 p-3 border rounded-lg" />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full mb-4 p-3 border rounded-lg" />
        <input type="tel" name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} className="w-full mb-4 p-3 border rounded-lg" />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required className="w-full mb-4 p-3 border rounded-lg" />
        <input type="password" name="confirmPassword" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} required className="w-full mb-4 p-3 border rounded-lg" />
        <select name="role" value={form.role} onChange={handleChange} className="w-full mb-4 p-3 border rounded-lg">
          <option value="Employee">Employee</option>
          <option value="Manager">Manager</option>
          <option value="Admin">Admin</option>
        </select>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold">Register</button>
        <p className="text-sm text-center mt-4">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;