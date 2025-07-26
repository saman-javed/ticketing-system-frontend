// ✅ Final Functional & Real-time Fixed TaskPage.js
// Solves the issue where tasks appear only after reload
// Fix: real-time updates + fetchTasks after each action

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const TaskPage = () => {
  const [tasks, setTasks] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    dueDate: ''
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const token = localStorage.getItem('token');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      toast.error('Error fetching tasks');
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
    const socket = io('http://localhost:5000');
    socket.on('taskCreated', fetchTasks);
    socket.on('taskUpdated', fetchTasks);
    socket.on('taskDeleted', fetchTasks);
    return () => socket.disconnect();
  }, [fetchTasks]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/tasks', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Task created!');
      setForm({ title: '', description: '', priority: 'medium', status: 'open', dueDate: '' });
    } catch (err) {
      toast.error('Error creating task');
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Error deleting task');
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/tasks/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    const worksheet = XLSX.utils.json_to_sheet(tasks);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, 'tasks.xlsx');
    toast.success('Exported to Excel');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Task List', 14, 10);
    const tableData = tasks.map((t, i) => [i + 1, t.title, t.priority, t.status, t.dueDate?.slice(0, 10) || 'N/A']);
    doc.autoTable({ head: [['#', 'Title', 'Priority', 'Status', 'Due Date']], body: tableData, startY: 20 });
    doc.save('tasks.pdf');
    toast.success('Exported to PDF');
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

        {/* Task Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl shadow-lg p-6 mb-8 grid gap-4 md:grid-cols-2 ${darkMode ? 'bg-zinc-800' : 'bg-white'}`}
        >
          <input type="text" name="title" placeholder="Title" value={form.title} onChange={handleChange} required className="p-3 border rounded-lg w-full" />
          <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="p-3 border rounded-lg w-full text-black" />
          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="p-3 border rounded-lg w-full md:col-span-2" />
          <select name="priority" value={form.priority} onChange={handleChange} className="p-3 border rounded-lg w-full">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg w-full font-semibold">Create Task</button>
        </motion.form>

        {/* Filters & Exports */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border rounded-lg">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="p-2 border rounded-lg">
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">📅 Excel</button>
          <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">📄 PDF</button>
        </div>

        {/* Task List */}
        <ul className="space-y-4">
          {tasks
            .filter(t => (!filterStatus || t.status === filterStatus) && (!filterPriority || t.priority === filterPriority))
            .map((task, i) => (
              <motion.li
                key={task._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl p-4 shadow border ${darkMode ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-gray-200'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-blue-500">{task.title}</h3>
                  <button onClick={() => deleteTask(task._id)} className="text-red-600 hover:underline text-sm">🗑 Delete</button>
                </div>
                <p className={`italic text-sm mb-1 ${textColor}`}>{task.description}</p>
                <p className={`text-xs ${textColor}`}>Priority: <strong>{task.priority}</strong></p>
                <p className={`text-xs ${textColor}`}>Due: <strong className="text-white dark:text-gray-300">{task.dueDate?.slice(0, 10) || 'N/A'}</strong></p>
                <select
                  value={task.status}
                  onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                  className="mt-2 p-2 border rounded-lg text-sm"
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
