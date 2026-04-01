export interface FileItem {
    id: string;
    name: string;
    size: string;
    updateTime: string;
    type: 'folder' | 'file';
    parentId: string | null;  // Changed from folderId to parentId for consistency
    icon?: string;
}

// 扁平化的文件数据，包含 parentId
export const allMockFiles: FileItem[] = [
    // Root Level (parentId: null)
    { id: '101', name: '共享文件', size: '-', updateTime: '2024/01/20 09:56', type: 'folder', parentId: null },
    { id: '102', name: '数据备份', size: '-', updateTime: '2024/01/20 09:56', type: 'folder', parentId: null },
    { id: '103', name: '项目文档', size: '-', updateTime: '2024/01/20 09:56', type: 'folder', parentId: null },
    { id: '1', name: '产品截图.png', size: '554.6 KB', updateTime: '2024/01/13 08:00', type: 'file', icon: 'image', parentId: null },
    { id: '2', name: '会议录音.mp3', size: '8.4 MB', updateTime: '2024/01/12 08:00', type: 'file', icon: 'audio', parentId: null },
    { id: '3', name: '配置文件.json', size: '2.3 KB', updateTime: '2024/01/08 08:00', type: 'file', icon: 'code', parentId: null },
    { id: '4', name: '数据分析报告.xlsx', size: '1.2 MB', updateTime: '2024/01/14 08:00', type: 'file', icon: 'excel', parentId: null },
    { id: '5', name: '项目计划书.pdf', size: '2.3 MB', updateTime: '2024/01/15 08:00', type: 'file', icon: 'pdf', parentId: null },
    { id: '6', name: '演示视频.mp4', size: '94.2 MB', updateTime: '2024/01/10 08:00', type: 'file', icon: 'video', parentId: null },
    { id: '7', name: '源代码.zip', size: '15.0 MB', updateTime: '2024/01/11 08:00', type: 'file', icon: 'archive', parentId: null },
    { id: '8', name: 'API文档.md', size: '44.6 KB', updateTime: '2024/01/09 08:00', type: 'file', icon: 'markdown', parentId: null },

    // Inside '项目文档' (id: 103)
    { id: '201', name: '需求分析.docx', size: '1.5 MB', updateTime: '2024/01/18 10:00', type: 'file', icon: 'word', parentId: '103' },
    { id: '202', name: '架构设计.pptx', size: '5.2 MB', updateTime: '2024/01/19 14:00', type: 'file', icon: 'ppt', parentId: '103' },

    // Inside '数据备份' (id: 102)
    { id: '301', name: 'backup_20240101.sql', size: '120 MB', updateTime: '2024/01/01 02:00', type: 'file', icon: 'code', parentId: '102' },
];

// Helper to get files by parentId
export function getFilesByParentId(parentId: string | null): FileItem[] {
    return allMockFiles.filter(f => f.parentId === parentId);
}

// Helper to get folder name by id
export function getFolderNameById(id: string): string {
    const folder = allMockFiles.find(f => f.id === id && f.type === 'folder');
    return folder ? folder.name : 'Unknown';
}
