import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config/api';
import { useStore } from '../store';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  step: string;
  message: string;
  data?: any;
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'debug'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { user } = useStore();

  // Start streaming logs
  const startStreaming = () => {
    if (!user?.token) {
      alert('请先登录');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection
    const eventSource = new EventSource(`${API_URL}/logs/stream?token=${user.token}`);
    
    eventSource.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data);
        setLogs(prev => [...prev, logEntry]);
        
        // Auto scroll to bottom
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Failed to parse log entry:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setIsStreaming(false);
    };

    eventSourceRef.current = eventSource;
    setIsStreaming(true);
  };

  // Stop streaming logs
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.level !== filter) {
      return false;
    }
    if (searchTerm && !JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Export logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Simulate batch generation with detailed logging
  const simulateBatchGeneration = async () => {
    const mockLogs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'BATCH-FLOW Step 1',
        message: '接收批量生成请求',
        data: {
          frameCount: 5,
          models: ['gemini', 'gemini', 'sora', 'gemini', 'sora'],
          imageSize: '16:9'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'BATCH-FLOW Step 2',
        message: '查询数据库获取项目和角色信息',
        data: {
          projectId: 123,
          charactersFound: ['角色A', '角色B']
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'BATCH-FLOW Step 3',
        message: '处理第1帧 - Gemini模型',
        data: {
          frameNumber: 1,
          model: 'gemini',
          characterImage: 'https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/storage/character/5/xxx.png'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        step: 'GeminiServiceV2 Step 1',
        message: '清理URL（移除末尾斜杠）',
        data: {
          original: 'https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/storage/character/5/xxx.png/',
          cleaned: 'https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/storage/character/5/xxx.png'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        step: 'GeminiServiceV2 Step 2',
        message: '提取R2存储key',
        data: {
          storageKey: 'character/5/xxx.png'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        step: 'GeminiServiceV2 Step 3',
        message: '从R2获取图片',
        data: {
          found: true,
          size: 245678,
          contentType: 'image/png'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        step: 'GeminiServiceV2 Step 4',
        message: '转换为Base64',
        data: {
          binarySize: 245678,
          base64Length: 327570,
          preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'GeminiServiceV2 Step 5',
        message: '调用云雾AI API',
        data: {
          endpoint: 'https://yunwu.ai/api/v1/messages',
          model: '65b0a99a4ce340f3bce16c77',
          hasReferenceImage: true
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'GeminiServiceV2 Step 6',
        message: '云雾API返回成功',
        data: {
          status: 200,
          imageUrl: 'https://generated-image-url.com/xxx.png'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'BATCH-FLOW Step 4',
        message: '处理第3帧 - Sora模型',
        data: {
          frameNumber: 3,
          model: 'sora',
          taskId: 'task-uuid-123'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        step: 'AIService Step 1',
        message: '调用GCR代理',
        data: {
          proxyUrl: 'https://aiyoutube-proxy.xxx.run.app/generate',
          taskId: 'task-uuid-123',
          callbackUrl: 'https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/generation/callback'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'GCR Proxy',
        message: '代理返回202，任务已接受',
        data: {
          taskId: 'task-uuid-123',
          status: 'processing'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        step: 'Callback',
        message: '收到GCR代理回调',
        data: {
          taskId: 'task-uuid-123',
          status: 'completed',
          imageUrl: 'https://generated-sora-image.com/yyy.png'
        }
      }
    ];

    // Simulate streaming logs with delay
    for (const log of mockLogs) {
      setLogs(prev => [...prev, log]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'debug': return 'text-gray-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">实时日志监控</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow">
          <div className="flex items-center space-x-4">
            <button
              onClick={isStreaming ? stopStreaming : startStreaming}
              className={`px-4 py-2 rounded ${
                isStreaming 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isStreaming ? '停止监控' : '开始监控'}
            </button>
            
            <button
              onClick={simulateBatchGeneration}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              模拟批量生成流程
            </button>
            
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清空日志
            </button>
            
            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              导出日志
            </button>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border rounded"
            >
              <option value="all">所有级别</option>
              <option value="error">错误</option>
              <option value="warn">警告</option>
              <option value="debug">调试</option>
            </select>
            
            <input
              type="text"
              placeholder="搜索日志..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded flex-1"
            />
          </div>
        </div>
        
        {/* Log entries */}
        <div className="bg-white rounded-lg shadow" style={{ height: '600px', overflowY: 'auto' }}>
          <div className="p-4">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                暂无日志，点击"开始监控"或"模拟批量生成流程"查看日志
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="border-b pb-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`text-xs font-semibold ${getLevelColor(log.level)}`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-sm font-medium">{log.step}:</span>
                      <span className="text-sm">{log.message}</span>
                    </div>
                    {log.data && (
                      <pre className="mt-1 ml-8 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
        
        {/* Statistics */}
        <div className="mt-4 bg-white rounded-lg p-4 shadow">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{logs.length}</div>
              <div className="text-sm text-gray-500">总日志数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">
                {logs.filter(l => l.level === 'error').length}
              </div>
              <div className="text-sm text-gray-500">错误</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {logs.filter(l => l.level === 'warn').length}
              </div>
              <div className="text-sm text-gray-500">警告</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-500">
                {logs.filter(l => l.level === 'debug').length}
              </div>
              <div className="text-sm text-gray-500">调试</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;