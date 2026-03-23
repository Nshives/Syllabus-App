'use client';
import { useState, useEffect } from 'react';

// --- Types ---
interface Assignment {
  id: number;
  title: string;
  dueDate: string | null;
  status: string; // 'pending' | 'completed'
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
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const PREVIEW_LIMIT = 5; 

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  
  // UI States
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<number[]>([]); 
  const [showAllTodos, setShowAllTodos] = useState(false);

  // Animation State: Tracks IDs of tasks currently doing the "Fade Out" dance
  const [completingIds, setCompletingIds] = useState<number[]>([]);

  // Add Task Form State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskCourseId, setNewTaskCourseId] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Time State (to ensure client-side matching)
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    // Set "Today" at midnight so we include tasks due today
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);

    fetchCourses();
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchCourses = async () => {
    const res = await fetch('/api/courses', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setCourses(data);
    }
  };

  // --- DERIVED STATE ---
  const todoList = courses
    .flatMap(course => 
      course.assignments.map(a => ({ ...a, courseTitle: course.title, courseColor: course.color, courseCode: course.code }))
    )
    .filter(a => {
      // 1. Must be pending
      if (a.status !== 'pending') return false;

      // 2. Must NOT be in the past (unless it has no date, we keep those)
      if (!a.dueDate) return true; 

      // Parse "YYYY-MM-DD" correctly
      const [y, m, d] = a.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d); // Month is 0-indexed
      
      // Keep if due date is >= today
      return dueDate >= today;
    })
    .sort((a, b) => {
      // Sort: Earliest date first. No-dates go to the bottom.
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 15);

  const visibleTodos = showAllTodos ? todoList : todoList.slice(0, 5);

  // --- HANDLERS ---

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

  const handleDeleteCourse = async (courseId: number) => {
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
      setExpandedCourses(expandedCourses.filter(id => id !== courseId)); 
    } else {
      setExpandedCourses([...expandedCourses, courseId]); 
    }
  };

  // --- TO-DO SPECIFIC ACTIONS ---

  const handleCompleteTask = async (id: number) => {
    // 1. Trigger Animation
    setCompletingIds(prev => [...prev, id]);

    // 2. Wait for animation (600ms)
    setTimeout(async () => {
      // 3. Remove from UI immediately after animation
      setCourses(prevCourses => prevCourses.map(c => ({
        ...c,
        assignments: c.assignments.map(a => a.id === id ? { ...a, status: 'completed' } : a)
      })));
      
      // Clear animation state
      setCompletingIds(prev => prev.filter(cid => cid !== id));

      // 4. Update Server
      try {
        await fetch(`/api/assignments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
      } catch (error) {
        console.error("Failed to sync task status");
        fetchCourses(); 
      }
    }, 600);
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Delete this task?")) return;

    setCourses(prevCourses => prevCourses.map(c => ({
      ...c,
      assignments: c.assignments.filter(a => a.id !== id)
    })));

    await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
  };

  const handleAddTask = async () => {
    if (!newTaskTitle || !newTaskCourseId) return;
    setIsSavingTask(true);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          courseId: newTaskCourseId,
          dueDate: newTaskDate || null
        })
      });

      if (res.ok) {
        const savedTask = await res.json();
        setCourses(prev => prev.map(c => {
          if (c.id === parseInt(newTaskCourseId)) {
            return { ...c, assignments: [...c.assignments, savedTask] };
          }
          return c;
        }));
        setIsAddingTask(false);
        setNewTaskTitle('');
        setNewTaskDate('');
        setNewTaskCourseId('');
      }
    } catch (error) {
      alert("Failed to add task");
    } finally {
      setIsSavingTask(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
          <a
            href="https://buymeacoffee.com/nshively"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-transform hover:scale-105 shadow-sm text-sm"
          >
            <span>☕</span> Support / Request Features
          </a>
        </div>

        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: COURSES --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upload Box */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Add a Syllabus</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {uploading && <span className="text-blue-600 font-medium animate-pulse whitespace-nowrap">Processing...</span>}
              </div>
              <p className="text-xs text-gray-400 mt-2">⚠️ Max size: 4.5MB (Compress if larger)</p>
              {message && <p className="mt-3 text-sm font-medium text-gray-700">{message}</p>}
            </div>

            {/* Course Grid */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Courses</h2>
              {courses.length === 0 ? (
                <p className="text-gray-400 italic">No courses yet. Upload a syllabus!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {courses.map((course) => {
                    const isExpanded = expandedCourses.includes(course.id);
                    const visibleAssignments = isExpanded ? course.assignments : course.assignments.slice(0, PREVIEW_LIMIT);
                    const hasMore = course.assignments.length > PREVIEW_LIMIT;

                    return (
                      <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 relative transition-all duration-300">
                        {/* Course Header */}
                        <div className="p-4 flex justify-between items-start" style={{ backgroundColor: course.color || '#3b82f6' }}>
                          <div>
                            <h3 className="text-white font-bold text-lg">{course.title}</h3>
                            <span className="text-white/80 text-sm bg-black/10 px-2 py-1 rounded inline-block mt-1">{course.code}</span>
                          </div>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setActiveMenuId(activeMenuId === course.id ? null : course.id)} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/20 transition">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                            </button>
                            {activeMenuId === course.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border border-gray-100 overflow-hidden">
                                <div className="p-3 border-b border-gray-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Theme Color</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {COLORS.map((c) => (
                                      <button key={c} onClick={() => handleColorChange(course.id, c)} className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition" style={{ backgroundColor: c }} />
                                    ))}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteCourse(course.id)} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2">🗑 Delete Course</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Assignments List */}
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-600 mb-3 text-sm uppercase tracking-wide">Assignments ({course.assignments.length})</h4>
                          <ul className="space-y-3 mb-2">
                            {visibleAssignments.map((assignment) => (
                              <li key={assignment.id} className="flex justify-between items-start text-sm group">
                                <span className={`font-medium truncate pr-4 ${assignment.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {assignment.title}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${assignment.dueDate ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-500'}`}>
                                  {assignment.dueDate || 'No Date'}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {hasMore && (
                            <button onClick={() => toggleExpand(course.id)} className="w-full mt-2 py-2 flex items-center justify-center text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors uppercase tracking-wider">
                              {isExpanded ? <span>Show Less ↑</span> : <span>Show {course.assignments.length - PREVIEW_LIMIT} More ↓</span>}
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

          {/* --- RIGHT COLUMN: TO-DO LIST --- */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden sticky top-8">
              
              {/* To-Do Header */}
              <div className="bg-gray-900 p-5 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">📝 To-Do List</h2>
                  <p className="text-gray-400 text-xs mt-1">Upcoming tasks (sorted by date)</p>
                </div>
                <button 
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg"
                  title="Add Custom Task"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
              </div>

              {/* Add Task Form (Updated for Visibility) */}
              {isAddingTask && (
                <div className="p-4 bg-white border-b-2 border-blue-100 animate-in slide-in-from-top-2 shadow-inner">
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Task Title..." 
                      className="w-full p-2.5 text-sm font-medium text-gray-900 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none placeholder-gray-400"
                      value={newTaskTitle} 
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        className="w-1/2 p-2.5 text-sm text-gray-700 font-medium border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                        value={newTaskDate} 
                        onChange={(e) => setNewTaskDate(e.target.value)}
                      />
                      <select 
                        className="w-1/2 p-2.5 text-sm text-gray-700 font-medium border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none bg-white"
                        value={newTaskCourseId} 
                        onChange={(e) => setNewTaskCourseId(e.target.value)}
                      >
                        <option value="">Select Class...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={handleAddTask}
                      disabled={isSavingTask || !newTaskTitle || !newTaskCourseId}
                      className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
                    >
                      {isSavingTask ? 'Saving...' : 'Add Task'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="p-0">
                {visibleTodos.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p>🎉 No pending tasks!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {visibleTodos.map(task => {
                      const isCompleting = completingIds.includes(task.id);
                      
                      return (
                        <div 
                          key={task.id} 
                          className={`p-3 flex gap-3 items-start group transition-all duration-500 ease-in-out
                            ${isCompleting ? 'bg-green-50 opacity-0 transform translate-x-10 max-h-0 py-0 overflow-hidden' : 'hover:bg-gray-50 opacity-100 max-h-20'}
                          `}
                        >
                          
                          {/* Checkbox */}
                          <button 
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={isCompleting}
                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0
                              ${isCompleting 
                                ? 'bg-green-500 border-green-500 scale-110' 
                                : 'border-gray-300 hover:border-blue-500'
                              }
                            `}
                          >
                            {isCompleting && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight transition-colors ${isCompleting ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold truncate max-w-[80px]"
                                style={{ backgroundColor: task.courseColor || '#9ca3af' }}
                              >
                                {task.courseCode}
                              </span>
                              <span className={`text-xs ${!task.dueDate ? 'text-gray-400' : 'text-gray-500'}`}>
                                {task.dueDate || 'No Date'}
                              </span>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {todoList.length > 5 && (
                <div className="bg-gray-50 p-2 border-t border-gray-100 text-center">
                  <button 
                    onClick={() => setShowAllTodos(!showAllTodos)}
                    className="text-xs font-bold text-gray-500 hover:text-blue-600 uppercase tracking-wide"
                  >
                    {showAllTodos ? 'Show Less' : `Show ${todoList.length - 5} More`}
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}