'use client';
import { useState, useEffect } from 'react';

// Types
interface Course {
  id: number;
  title: string;
  code: string;
  color: string;
  assignments: Assignment[];
}

interface Assignment {
  id: number;
  title: string;
  dueDate: string | null;
  status: string; // 'pending' | 'completed'
  course: Course;
}

export default function CalendarPage() {
  // 1. FIX: Add a 'mounted' state to prevent Server Side Rendering (SSR) of the date
  const [isMounted, setIsMounted] = useState(false);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  
  // Initialize with new Date() but it won't be shown until isMounted is true
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [now, setNow] = useState(new Date()); 
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 2. FIX: This runs ONLY in the browser. We capture the real local time here.
    setIsMounted(true);
    const today = new Date();
    setNow(today);
    setCurrentDate(today);
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/courses', { cache: 'no-store' });
      if (res.ok) {
        const courses: Course[] = await res.json(); // 👈 Explicitly typed as Course array
        setAllCourses(courses);
        
        // 💡 THE CLEAN FIX: No 'any' needed. 
        // We extract the assignments and ensure the course object is attached to each.
        const allAssignments: Assignment[] = courses.flatMap((course: Course) => 
          course.assignments.map((assignment) => ({ 
            ...assignment, 
            course: course 
          }))
        );
        
        setAssignments(allAssignments);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  const getDateString = (date: Date) => {
    // FIX: Use local time string construction to avoid UTC shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- ACTIONS ---

  const toggleStatus = async (id: number) => {
    const target = assignments.find(a => a.id === id);
    if (!target) return;
    const newStatus = target.status === 'completed' ? 'pending' : 'completed';

    // Optimistic
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

    try {
      await fetch(`/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) {
      console.error("Failed to save status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    setAssignments(prev => prev.filter(a => a.id !== id));

    try {
      const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (error) {
      alert("Failed to delete assignment");
      fetchData();
    }
  };

  const handleAddAssignment = async () => {
    if (!newTitle || !newCourseId || !selectedDay) return;
    setIsSaving(true);
    const dateStr = getDateString(selectedDay);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          courseId: newCourseId,
          dueDate: dateStr
        })
      });

      if (res.ok) {
        const savedAssignment = await res.json();
        setAssignments([...assignments, savedAssignment]);
        setIsAdding(false);
        setNewTitle('');
        setNewCourseId('');
      }
    } catch (error) {
      alert("Failed to save assignment");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. FIX: Prevent Hydration Error. If not mounted, show nothing (or a spinner).
  // This ensures the user never sees the "Server Time" version of the calendar.
  if (!isMounted) {
    return null; 
  }

  // Calendar Helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const goToToday = () => {
    const today = new Date();
    setNow(today);
    setCurrentDate(today);
  };

  const getAssignmentsForDay = (date: Date) => {
    return assignments.filter(a => {
      if (!a.dueDate) return false;
      // Parse the 'YYYY-MM-DD' string manually to avoid timezone shift
      const [y, m, d] = a.dueDate.split('-').map(Number);
      // Create a local date object from the parts (Month is 0-indexed in JS dates)
      const assignDate = new Date(y, m - 1, d);
      
      return (
        assignDate.getFullYear() === date.getFullYear() &&
        assignDate.getMonth() === date.getMonth() &&
        assignDate.getDate() === date.getDate()
      );
    });
  };

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 relative">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📅 {monthName}
          </h1>
          <div className="flex gap-3">
            <button 
              onClick={prevMonth} 
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 shadow-sm rounded-lg hover:bg-gray-50 hover:text-gray-900 font-medium transition-all"
            >
              ← Prev
            </button>
            <button 
              onClick={goToToday} 
              className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 shadow-sm rounded-lg hover:bg-blue-100 font-medium transition-all"
            >
              Today
            </button>
            <button 
              onClick={nextMonth} 
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 shadow-sm rounded-lg hover:bg-gray-50 hover:text-gray-900 font-medium transition-all"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[140px] bg-gray-50/30 border-r border-b border-gray-100" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayAssignments = getAssignmentsForDay(thisDate);
            
            // Compare using local date strings to be safe
            const isToday = now.toDateString() === thisDate.toDateString();

            return (
              <div 
                key={day} 
                onClick={() => { setSelectedDay(thisDate); setIsAdding(false); }}
                className={`min-h-[140px] p-2 border-r border-b border-gray-100 transition-colors cursor-pointer hover:bg-gray-50 ${isToday ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`}>
                    {day}
                  </span>
                  {dayAssignments.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded-full">{dayAssignments.length}</span>
                  )}
                </div>
                
                <div className="space-y-1 overflow-hidden">
                  {dayAssignments.slice(0, 3).map(task => (
                    <div 
                      key={task.id} 
                      className={`text-xs p-1 rounded border-l-4 truncate shadow-sm transition-all
                        ${task.status === 'completed' ? 'line-through opacity-50' : 'opacity-90'}
                      `}
                      style={{
                        backgroundColor: (task.course.color || '#3b82f6') + '20', 
                        borderColor: task.course.color || '#3b82f6',
                        color: '#374151'
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayAssignments.length > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1 font-medium">+ {dayAssignments.length - 3} more...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🟢 THE MODAL WINDOW */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{formatSelectedDate(selectedDay)}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {getAssignmentsForDay(selectedDay).length} Assignments Due
                </p>
              </div>
              
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-2 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full text-gray-500 transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {getAssignmentsForDay(selectedDay).length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">☕️</div>
                  <p className="text-gray-400 font-medium">Nothing due today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getAssignmentsForDay(selectedDay).map(task => {
                    const isComplete = task.status === 'completed';
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`p-4 rounded-xl border shadow-sm flex gap-4 items-start group transition-all duration-200 relative pr-10
                          ${isComplete ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-100 hover:shadow-md'}
                        `}
                        style={{ borderLeft: `5px solid ${task.course.color || '#3b82f6'}` }}
                      >
                        <button 
                          onClick={() => toggleStatus(task.id)}
                          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0
                            ${isComplete 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }
                          `}
                        >
                          {isComplete && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-lg leading-tight mb-1 break-words transition-all
                            ${isComplete ? 'line-through text-gray-400 decoration-2 decoration-gray-300' : 'text-gray-800'}
                          `}>
                            {task.title}
                          </h3>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <span 
                              className={`text-xs font-bold px-2 py-0.5 rounded text-white whitespace-nowrap ${isComplete ? 'opacity-50' : ''}`}
                              style={{ backgroundColor: task.course.color || '#3b82f6' }}
                            >
                              {task.course.code}
                            </span>
                            <span className="text-xs text-gray-400 truncate">{task.course.title}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleDelete(task.id);
                          }}
                          className="absolute top-4 right-3 text-gray-300 hover:text-red-500 transition-colors p-1"
                          title="Delete Assignment"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🟢 MODAL FOOTER */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              {!isAdding ? (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full py-3 bg-white border border-dashed border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="text-lg font-bold">+</span> Add Assignment
                </button>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-bottom-2 flex flex-col gap-4">
                  
                  {/* Row 1: Title Input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Task</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Read Chapter 5"
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  {/* Row 2: Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Class</label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={newCourseId}
                      onChange={(e) => setNewCourseId(e.target.value)}
                    >
                      <option value="">Select Course...</option>
                      {allCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Buttons */}
                  <div className="flex justify-end gap-3 mt-1">
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAddAssignment}
                      disabled={isSaving || !newTitle || !newCourseId}
                      className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all"
                    >
                      {isSaving ? 'Saving...' : 'Save Task'}
                    </button>
                  </div>

                </div>
              )}
            </div>w

          </div>
        </div>
      )}
    </div>
  );
}