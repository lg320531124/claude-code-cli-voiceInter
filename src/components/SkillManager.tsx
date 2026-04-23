import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { X, Upload, FileText, Trash2, Plus, Download } from 'lucide-react';

/**
 * Skill Manager Component
 * Allows users to import, view, and manage Claude Code skills
 */
function SkillManager({ isOpen, onClose }) {
  const { sendMessage, latestMessage } = useWebSocket();

  const [skills, setSkills] = useState([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillContent, setNewSkillContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch skills on mount
  useEffect(() => {
    if (isOpen) {
      sendMessage({ type: 'list-skills' });
      setLoading(true);
    }
  }, [isOpen, sendMessage]);

  // Handle responses
  useEffect(() => {
    if (!latestMessage) return;

    if (latestMessage.type === 'skills-list') {
      setSkills(latestMessage.skills || []);
      setLoading(false);
    }

    if (latestMessage.type === 'skill-created') {
      setSkills(prev => [...prev, latestMessage.skill]);
      setNewSkillName('');
      setNewSkillContent('');
      setIsCreating(false);
    }

    if (latestMessage.type === 'skill-deleted') {
      setSkills(prev => prev.filter(s => s.name !== latestMessage.name));
    }
  }, [latestMessage]);

  // Create new skill
  const handleCreateSkill = () => {
    if (!newSkillName.trim() || !newSkillContent.trim()) return;

    sendMessage({
      type: 'create-skill',
      name: newSkillName.trim(),
      content: newSkillContent.trim()
    });
  };

  // Delete skill
  const handleDeleteSkill = (name) => {
    sendMessage({
      type: 'delete-skill',
      name
    });
  };

  // Import skill from file
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const content = await file.text();
    const name = file.name.replace('.md', '');

    sendMessage({
      type: 'create-skill',
      name,
      content
    });

    // Reset file input
    e.target.value = '';
  };

  // Export skill
  const handleExportSkill = (skill) => {
    const blob = new Blob([skill.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Skill Manager</h2>
              <p className="text-sm text-white/50">Manage Claude Code skills</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {/* Import Button */}
          <div className="flex gap-3 mb-6">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/70">Import .md file</span>
              <input
                type="file"
                accept=".md"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="text-sm text-white">New Skill</span>
            </button>
          </div>

          {/* Create New Skill Form */}
          {isCreating && (
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Skill name (e.g., my-skill)"
                className="w-full px-4 py-2 mb-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
              />
              <textarea
                value={newSkillContent}
                onChange={(e) => setNewSkillContent(e.target.value)}
                placeholder="Skill content (markdown format with YAML frontmatter)"
                rows={6}
                className="w-full px-4 py-3 mb-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateSkill}
                  disabled={!newSkillName.trim() || !newSkillContent.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Skills List */}
          {loading ? (
            <div className="text-center py-8 text-white/50">
              Loading skills...
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No skills yet. Import or create one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-medium text-white">{skill.name}</h3>
                      <p className="text-xs text-white/40">{skill.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSkill(skill)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Export"
                    >
                      <Download className="w-4 h-4 text-white/50 hover:text-white" />
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(skill.name)}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/30">
          Skills are stored in .claude/skills/ directory and auto-loaded by Claude CLI
        </div>
      </div>
    </div>
  );
}

export default SkillManager;