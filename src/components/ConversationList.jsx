// src/components/ConversationList.jsx
//
// 左侧对话列表组件
// - 显示所有对话
// - 创建新对话
// - 切换/删除对话
// - 搜索对话
// - 对话统计显示

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MessageSquare, Search, Clock, MoreHorizontal, Edit3, Check, X } from 'lucide-react';
import {
  createConversation,
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  deleteConversation,
  renameConversation,
  getConversationStats,
  searchConversations
} from '../utils/conversationManager';

function ConversationList({
  activeConversationId,
  onConversationSelect,
  onConversationCreate,
  onConversationDelete,
  collapsed = false
}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showMenuId, setShowMenuId] = useState(null);

  // 加载对话列表
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);

    // 如果没有活动对话，选择最新的
    if (!activeConversationId && loaded.length > 0) {
      onConversationSelect?.(loaded[0].id);
    }
  }, [activeConversationId, onConversationSelect]);

  // 创建新对话
  const handleCreate = () => {
    const newConv = createConversation();
    const updated = [...conversations, newConv];
    setConversations(updated);
    saveConversations(updated);
    setActiveConversationId(newConv.id);
    onConversationCreate?.(newConv);
    onConversationSelect?.(newConv.id);
  };

  // 删除对话
  const handleDelete = (id) => {
    const updated = deleteConversation(conversations, id);
    setConversations(updated);

    // 如果删除的是当前活动对话，切换到最新的
    if (id === activeConversationId) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveConversationId(nextId);
      onConversationSelect?.(nextId);
    }

    onConversationDelete?.(id);
    setShowMenuId(null);
  };

  // 开始重命名
  const handleStartRename = (conv) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
    setShowMenuId(null);
  };

  // 保存重命名
  const handleSaveRename = () => {
    if (editingTitle.trim()) {
      const updated = renameConversation(conversations, editingId, editingTitle.trim());
      setConversations(updated);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  // 取消重命名
  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // 搜索过滤
  const filteredConversations = searchQuery
    ? searchConversations(conversations, searchQuery)
    : conversations;

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 紧凑模式 (折叠)
  if (collapsed) {
    return (
      <div className="w-12 bg-gray-900 flex flex-col items-center py-2">
        {/* 新建按钮 */}
        <button
          onClick={handleCreate}
          className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition"
          title="新建对话"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* 对话图标列表 */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          {filteredConversations.slice(0, 10).map((conv) => (
            <button
              key={conv.id}
              onClick={() => onConversationSelect?.(conv.id)}
              className={`p-2 rounded-lg transition ${
                activeConversationId === conv.id
                  ? 'bg-purple-500/30 text-purple-400'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
              title={conv.title}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 完整模式
  return (
    <div className="w-64 bg-gray-900/50 border-r border-gray-800 flex flex-col">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">对话列表</span>
          <button
            onClick={handleCreate}
            className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition"
            title="新建对话"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-6 pr-2 py-1 rounded bg-gray-800 text-gray-300 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? '未找到匹配的对话' : '暂无对话'}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`group relative p-3 border-b border-gray-800/50 cursor-pointer transition ${
                activeConversationId === conv.id
                  ? 'bg-purple-500/10'
                  : 'hover:bg-gray-800/30'
              }`}
              onClick={() => {
                if (editingId !== conv.id) {
                  onConversationSelect?.(conv.id);
                }
              }}
            >
              {/* 编辑模式 */}
              {editingId === conv.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-gray-800 text-gray-300 text-sm border border-purple-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveRename}
                    className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelRename}
                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  {/* 标题 */}
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${
                      activeConversationId === conv.id ? 'text-purple-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm truncate ${
                      activeConversationId === conv.id ? 'text-purple-300' : 'text-gray-300'
                    }`}>
                      {conv.title}
                    </span>
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(conv.updatedAt)}</span>
                    <span>• {conv.messages.length} 条</span>
                  </div>

                  {/* 操作菜单 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenuId(showMenuId === conv.id ? null : conv.id);
                    }}
                    className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition"
                  >
                    <MoreHorizontal className="w-3 h-3 text-gray-400" />
                  </button>

                  {/* 下拉菜单 */}
                  {showMenuId === conv.id && (
                    <div className="absolute right-2 top-6 bg-gray-800 rounded shadow-xl border border-gray-700 py-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(conv);
                        }}
                        className="px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-1 w-full"
                      >
                        <Edit3 className="w-3 h-3" />
                        重命名
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conv.id);
                        }}
                        className="px-3 py-1 text-xs text-red-400 hover:bg-gray-700 flex items-center gap-1 w-full"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* 底部统计 */}
      <div className="p-2 border-t border-gray-800 text-xs text-gray-500 text-center">
        {conversations.length} 个对话
      </div>
    </div>
  );
}

export default ConversationList;