'use client';
import { useState, useEffect } from 'react';

// --- Types ---
interface Assignment {
  id: number;
  title: string;
  dueDate: string | null;
  status: string;
}

interface Course {
  id: number;
  title: string;
  code: string;
  color: string;
  assignments: Assignment[];
}

// --- Constants ---
const COLORS = [
  '#3b82f6', // Blue (Default)
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const PREVIEW_LIMIT = 5; // How many assignments to show before hiding

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  
  // State for menus and expansion
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<number[]>([]); // Array of IDs that are fully open

  useEffect(() => {
    fetchCourses();
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchCourses = async () => {
    // cache: 'no-store' ensures we see color changes instantly
    const res = await fetch('/api/courses', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setCourses(data);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    setMessage('⏳ Reading PDF & Asking Gemini...');
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch('/api/parse-syllabus', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Success! Added: ${data.course.title}`);
        fetchCourses();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Upload Failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    setCourses(courses.filter(c => c.id !== courseId));
    await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
  };

  const handleColorChange = async (courseId: number, newColor: string) => {
    setCourses(courses.map(c => c.id === courseId ? { ...c, color: newColor } : c));
    await fetch(`/api/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ color: newColor }),
    });
  };

  const toggleExpand = (courseId: number) => {
    if (expandedCourses.includes(courseId)) {
      setExpandedCourses(expandedCourses.filter(id => id !== courseId)); // Remove ID (Close)
    } else {
      setExpandedCourses([...expandedCourses, courseId]); // Add ID (Open)
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">My Dashboard</h1>
        
        {/* Upload Box */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-10">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Add a Syllabus</h2>
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            {uploading && <span className="text-blue-600 font-medium animate-pulse">Processing...</span>}
          </div>
          {message && <p className="mt-3 text-sm font-medium text-gray-700">{message}</p>}
        </div>

        {/* Course Grid */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Courses</h2>
        
        {courses.length === 0 ? (
          <p className="text-gray-400 italic">No courses yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {courses.map((course) => {
              const isExpanded = expandedCourses.includes(course.id);
              const visibleAssignments = isExpanded 
                ? course.assignments 
                : course.assignments.slice(0, PREVIEW_LIMIT);
              const hasMore = course.assignments.length > PREVIEW_LIMIT;

              return (
                <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 relative transition-all duration-300">
                  
                  {/* Card Header */}
                  <div 
                    className="p-4 flex justify-between items-start"
                    style={{ backgroundColor: course.color || '#3b82f6' }}
                  >
                    <div>
                      <h3 className="text-white font-bold text-lg">{course.title}</h3>
                      <span className="text-white/80 text-sm bg-black/10 px-2 py-1 rounded inline-block mt-1">
                        {course.code}
                      </span>
                    </div>

                    {/* 3-Dot Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === course.id ? null : course.id)}
                        className="text-white/80 hover:text-white p-1 rounded hover:bg-white/20 transition"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>

                      {activeMenuId === course.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border border-gray-100 overflow-hidden">
                          <div className="p-3 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Theme Color</p>
                            <div className="grid grid-cols-4 gap-2">
                              {COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => handleColorChange(course.id, c)}
                                  className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(course.id)}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                          >
                            🗑 Delete Course
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignments List */}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-600 mb-3 text-sm uppercase tracking-wide">
                      Assignments ({course.assignments.length})
                    </h4>
                    
                    <ul className="space-y-3 mb-2">
                      {visibleAssignments.map((assignment) => (
                        <li key={assignment.id} className="flex justify-between items-start text-sm group">
                          <span className="text-gray-800 font-medium truncate pr-4">
                            {assignment.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${assignment.dueDate ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-500'}`}>
                            {assignment.dueDate || 'No Date'}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Expand/Collapse Button (Only shows if list is long) */}
                    {hasMore && (
                      <button 
                        onClick={() => toggleExpand(course.id)}
                        className="w-full mt-2 py-2 flex items-center justify-center text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors uppercase tracking-wider"
                      >
                        {isExpanded ? (
                          <span className="flex items-center gap-1">Show Less ↑</span>
                        ) : (
                          <span className="flex items-center gap-1">Show {course.assignments.length - PREVIEW_LIMIT} More ↓</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}