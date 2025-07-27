import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const TaskPage = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    dueDate: '',
    assignedTo: ''
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Employee'
  });

  const fetchTasks = useCallback(async () => {
    try {
      let url = '/api/tasks';
      if (user?.role === 'Manager') url += '?manager=true';
      else if (user?.role === 'Employee') url += '?mine=true';
      
      const res = await axios.get(url);
      setTasks(res.data);
    } catch (err) {
      toast.error('Error fetching tasks');
    }
  }, [user?.role]);

  useEffect(() => {
    fetchTasks();
    const socket = io('http://localhost:5000');
    socket.on('taskCreated', fetchTasks);
    socket.on('taskUpdated', fetchTasks);
    socket.on('taskDeleted', fetchTasks);
    return () => socket.disconnect();
  }, [fetchTasks]);

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      axios.get('/api/users').then(res => setUsers(res.data));
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUserFormChange = (e) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', { 
        ...form, 
        assignedTo: form.assignedTo || null 
      });
      toast.success('Task created!');
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open',
        dueDate: '',
        assignedTo: ''
      });
    } catch (err) {
      toast.error('Error creating task');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (userForm.password !== userForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await axios.post('/api/auth/register', {
        fullName: userForm.fullName,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role
      });
      toast.success('User created successfully!');
      setShowUserForm(false);
      setUserForm({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Employee'
      });
      // Refresh users list
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`);
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Error deleting task');
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/tasks/${id}`, { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      toast.error('Error updating task');
    }
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'closed') return false;
    return new Date(task.dueDate) < new Date();
  };

  const exportToExcel = () => {
    try {
      const excelData = tasks.map(task => ({
        'Title': task.title,
        'Description': task.description,
        'Priority': task.priority,
        'Status': task.status,
        'Due Date': task.dueDate?.slice(0, 10) || 'N/A',
        'Assigned To': task.assignedTo?.fullName || 'Unassigned',
        'Assigned Role': task.assignedTo?.role || '',
        'Created At': task.createdAt?.slice(0, 10) || 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
      XLSX.writeFile(workbook, 'tasks_export.xlsx');
      toast.success('Exported to Excel successfully');
    } catch (err) {
      toast.error('Failed to export to Excel');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Task List', 14, 10);
    
    const tableData = tasks.map((task, index) => [
      index + 1,
      task.title || 'N/A',
      task.priority || 'N/A',
      task.status || 'N/A',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
      task.assignedTo?.fullName || 'Unassigned'
    ]);

    doc.autoTable({
      head: [['#', 'Title', 'Priority', 'Status', 'Due Date', 'Assigned To']],
      body: tableData,
      startY: 20,
      styles: {
        fontSize: 10,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    doc.save('tasks_report.pdf');
    toast.success('PDF exported successfully');
  };

  const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';

  const colors = {
    Total: 'bg-indigo-500',
    Completed: 'bg-emerald-500',
    'In Progress': 'bg-orange-400',
    Overdue: 'bg-rose-500'
  };

  return (
    <div className={darkMode ? 'bg-zinc-900 text-white min-h-screen' : 'bg-gray-50 text-black min-h-screen'}>
      <Toaster position="top-right" />
      
      {/* User Creation Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl shadow-lg p-6 w-full max-w-md ${darkMode ? 'bg-zinc-800' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={userForm.fullName}
                onChange={handleUserFormChange}
                className="w-full p-3 border rounded-lg"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={userForm.email}
                onChange={handleUserFormChange}
                className="w-full p-3 border rounded-lg"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={userForm.password}
                onChange={handleUserFormChange}
                className="w-full p-3 border rounded-lg"
                required
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={userForm.confirmPassword}
                onChange={handleUserFormChange}
                className="w-full p-3 border rounded-lg"
                required
              />
              <select
                name="role"
                value={userForm.role}
                onChange={handleUserFormChange}
                className="w-full p-3 border rounded-lg"
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                {user?.role === 'Admin' && <option value="Admin">Admin</option>}
              </select>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex-1"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-4xl font-bold tracking-tight">📋 Task Dashboard</h2>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Toggle {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total', value: tasks.length },
            { title: 'Completed', value: tasks.filter(t => t.status === 'completed').length },
            { title: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length },
            { title: 'Overdue', value: tasks.filter(t => isOverdue(t)).length }
          ].map(({ title, value }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${colors[title]} text-white rounded-xl p-5 shadow-lg text-center`}
            >
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-3xl font-bold">{value}</p>
            </motion.div>
          ))}
        </div>

        {/* Controls Section */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {user?.role === 'Admin' && (
            <button 
              onClick={() => setShowUserForm(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              + Create User
            </button>
          )}
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="p-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)} 
            className="p-2 border rounded-lg"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            📅 Excel
          </button>
          <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
            📄 PDF
          </button>
        </div>

        {/* Task Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl shadow-lg p-6 mb-8 grid gap-4 md:grid-cols-2 ${darkMode ? 'bg-zinc-800' : 'bg-white'}`}
        >
          <input 
            type="text" 
            name="title" 
            placeholder="Title" 
            value={form.title} 
            onChange={handleChange} 
            required 
            className="p-3 border rounded-lg w-full" 
          />
          <input 
            type="date" 
            name="dueDate" 
            value={form.dueDate} 
            onChange={handleChange} 
            className="p-3 border rounded-lg w-full" 
          />
          <textarea 
            name="description" 
            placeholder="Description" 
            value={form.description} 
            onChange={handleChange} 
            className="p-3 border rounded-lg w-full md:col-span-2" 
          />
          <select 
            name="priority" 
            value={form.priority} 
            onChange={handleChange} 
            className="p-3 border rounded-lg w-full"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <select 
              name="assignedTo" 
              value={form.assignedTo} 
              onChange={handleChange}
              className="p-3 border rounded-lg w-full md:col-span-2"
            >
              <option value="">Unassigned</option>
              {users
                .filter(u => u.role !== 'Admin')
                .map(u => (
                  <option key={u._id} value={u._id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
            </select>
          )}
          <button 
            type="submit" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg w-full font-semibold md:col-span-2"
          >
            Create Task
          </button>
        </motion.form>

        {/* Task List */}
        <ul className="space-y-4">
          {tasks
            .filter(t => (!filterStatus || t.status === filterStatus) && 
                         (!filterPriority || t.priority === filterPriority))
            .map((task, i) => (
              <motion.li
                key={task._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl p-4 shadow border ${darkMode ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-gray-200'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-blue-500">{task.title}</h3>
                    {task.assignedTo && (
                      <p className="text-xs text-gray-500">
                        Assigned to: {task.assignedTo.fullName} ({task.assignedTo.role})
                      </p>
                    )}
                  </div>
                  {(user?.role === 'Admin' || user?.id === task.createdBy) && (
                    <button 
                      onClick={() => deleteTask(task._id)} 
                      className="text-red-600 hover:underline text-sm"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
                <p className={`italic text-sm mb-1 ${textColor}`}>{task.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <p className={textColor}>Priority: <strong>{task.priority}</strong></p>
                  <p className={textColor}>Due: <strong>{task.dueDate?.slice(0, 10) || 'N/A'}</strong></p>
                  <p className={textColor}>Status: <strong>{task.status}</strong></p>
                </div>
                <select
                  value={task.status}
                  onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                  className="mt-2 p-2 border rounded-lg text-sm w-full"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </motion.li>
            ))}
        </ul>
      </main>
    </div>
  );
};

export default TaskPage;