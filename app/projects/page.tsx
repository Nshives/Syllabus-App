'use client';
import { useState, useEffect } from 'react';

interface ProjectStep {
  id: number;
  title: string;
  date: string | null;
  completed: boolean;
}

interface Project {
  id: number;
  title: string;
  summary: string | null;
  deliverables: string | null;
  turnInInfo: string | null;
  dueDate: string | null;
  steps: ProjectStep[];
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // States for Adding a Step
  const [addingStepTo, setAddingStepTo] = useState<number | null>(null);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDate, setNewStepDate] = useState('');

  // States for Editing a Step
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await fetch('/api/generate-project', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    setMessage('⏳ Reading Brief & Generating Timeline...');
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch('/api/generate-project', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(`✅ Success! Broken down: ${data.title}`);
        fetchProjects();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Upload Failed');
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entire project?')) return;
    setProjects(projects.filter(p => p.id !== id));
    await fetch(`/api/generate-project?id=${id}`, { method: 'DELETE' });
  };

  // --- NEW STEP MANAGEMENT FUNCTIONS ---

  const handleAddStep = async (projectId: number) => {
    if (!newStepTitle) return;

    const res = await fetch('/api/project-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, title: newStepTitle, date: newStepDate || null })
    });

    if (res.ok) {
      const newStep = await res.json();
      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, steps: [...p.steps, newStep] } : p
      ));
      setAddingStepTo(null);
      setNewStepTitle('');
      setNewStepDate('');
    }
  };

  const handleDeleteStep = async (projectId: number, stepId: number) => {
    if (!confirm('Delete this milestone?')) return;
    
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, steps: p.steps.filter(s => s.id !== stepId) } : p
    ));
    
    await fetch(`/api/project-steps?id=${stepId}`, { method: 'DELETE' });
  };

  const handleSaveEdit = async (projectId: number, stepId: number) => {
    if (!editStepTitle) return;

    setProjects(projects.map(p => 
      p.id === projectId ? {
        ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, title: editStepTitle } : s)
      } : p
    ));
    setEditingStepId(null);

    await fetch('/api/project-steps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, title: editStepTitle })
    });
  };

  const handleUpdateStepDate = async (projectId: number, stepId: number, newDate: string) => {
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          steps: p.steps.map(s => s.id === stepId ? { ...s, date: newDate } : s)
        };
      }
      return p;
    }));

    await fetch('/api/project-steps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, date: newDate })
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Project Manager</h1>
            <p className="text-gray-500 text-sm mt-1">AI-powered breakdowns for your biggest studio briefs</p>
          </div>
          <a
            href="https://buymeacoffee.com/nshively"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-transform hover:scale-105 shadow-sm text-sm"
          >
            <span>☕</span> Support
          </a>
        </div>

        {/* UPLOAD BOX */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 mb-10">
          <h2 className="text-lg font-semibold text-indigo-800 mb-2">Upload a Project Brief</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer transition-colors"
            />
            {uploading && (
              <span className="text-indigo-600 font-medium animate-pulse whitespace-nowrap bg-indigo-50 px-3 py-1 rounded-full text-sm">
                Thinking...
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Upload your PDF brief to auto-generate milestones.</p>
          {message && <p className={`mt-3 text-sm font-medium ${message.includes('Error') || message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
        </div>

        {/* PROJECTS GRID */}
        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400 italic text-lg">No projects yet.</p>
            <p className="text-gray-400 text-sm mt-2">Upload a brief to let AI do the heavy lifting.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                
                {/* LEFT SIDE: Project Details */}
                <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 leading-tight">{project.title}</h2>
                      {project.dueDate && (
                        <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-full">
                          Final Due: {new Date(project.dueDate).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Delete Project"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  {project.summary && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        {project.summary}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {project.deliverables && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">📦 Deliverables</h4>
                        <p className="text-sm text-gray-800 font-medium">{project.deliverables}</p>
                      </div>
                    )}
                    {project.turnInInfo && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">📥 How to Submit</h4>
                        <p className="text-sm text-gray-800">{project.turnInInfo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE: Timeline / Steps */}
                <div className="p-6 md:w-1/2 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>⏱️</span> Action Plan
                  </h3>
                  
                  <div className="relative border-l-2 border-indigo-100 ml-3 space-y-4 mt-6 pb-2">
                    {project.steps.map((step) => (
                      <div key={step.id} className="relative pl-6 group">
                        
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 group-hover:scale-125 transition-transform"></div>
                        
                        <div className="bg-gray-50 hover:bg-indigo-50/60 p-3 rounded-lg border border-gray-100 transition-colors flex justify-between items-start gap-3">
                          
                          <div className="flex-1">
                            {/* Inline Edit Form vs Static Title */}
                            {editingStepId === step.id ? (
                              <div className="flex flex-col gap-2 mb-2">
                                <input 
                                  type="text" 
                                  value={editStepTitle} 
                                  onChange={(e) => setEditStepTitle(e.target.value)} 
                                  className="text-sm border-2 border-indigo-300 rounded px-2 py-1 outline-none focus:border-indigo-500 w-full bg-white" 
                                  autoFocus 
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveEdit(project.id, step.id)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded font-bold hover:bg-indigo-700">Save</button>
                                  <button onClick={() => setEditingStepId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <h4 className="text-sm font-bold text-gray-800 mb-1 leading-tight group-hover:text-indigo-800 transition-colors">{step.title}</h4>
                            )}
                            
                            {/* Date Area */}
                            {step.date ? (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                  {new Date(step.date).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                                </span>
                                {/* Hidden date input allowing changes by clicking the existing date block */}
                                <input 
                                  type="date" 
                                  onChange={(e) => handleUpdateStepDate(project.id, step.id, e.target.value)}
                                  className="opacity-0 absolute w-10 h-6 cursor-pointer"
                                  title="Change Date"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-1">
                                <input 
                                  type="date" 
                                  onChange={(e) => handleUpdateStepDate(project.id, step.id, e.target.value)}
                                  className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 outline-none text-gray-500 focus:border-indigo-400 cursor-pointer bg-white"
                                />
                              </div>
                            )}
                          </div>

                          {/* Action Buttons (Edit & Delete) - Show on Hover */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setEditingStepId(step.id); setEditStepTitle(step.title); }} 
                              className="text-gray-400 hover:text-indigo-600 p-1 rounded" title="Edit Step"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteStep(project.id, step.id)} 
                              className="text-gray-400 hover:text-red-500 p-1 rounded" title="Delete Step"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}

                    {/* Add Custom Milestone Button / Form */}
                    <div className="relative pl-6 mt-4">
                      <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-gray-100 border-4 border-gray-300"></div>
                      
                      {addingStepTo === project.id ? (
                        <div className="bg-white p-3 rounded-lg border-2 border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                          <input 
                            type="text" 
                            placeholder="Milestone title..." 
                            value={newStepTitle} 
                            onChange={(e) => setNewStepTitle(e.target.value)} 
                            className="w-full text-sm border-2 border-gray-200 rounded px-2 py-1.5 mb-2 outline-none focus:border-indigo-500" 
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <input 
                              type="date" 
                              value={newStepDate} 
                              onChange={(e) => setNewStepDate(e.target.value)} 
                              className="text-sm border-2 border-gray-200 rounded px-2 py-1 flex-1 outline-none focus:border-indigo-500" 
                            />
                            <button 
                              onClick={() => handleAddStep(project.id)} 
                              disabled={!newStepTitle}
                              className="bg-indigo-600 text-white text-xs px-4 rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Add
                            </button>
                            <button onClick={() => setAddingStepTo(null)} className="text-gray-500 text-xs px-2 hover:text-gray-800">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setAddingStepTo(project.id); setNewStepTitle(''); setNewStepDate(''); }} 
                          className="text-sm font-bold text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors py-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          Add Custom Milestone
                        </button>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}