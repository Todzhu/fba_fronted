/**
 * 我的数据 Mock API
 * 模拟用户数据目录结构和分组模板
 */

// ========== 类型定义 ==========

export interface FileNode {
  key: string;
  title: string;
  path: string;
  isLeaf: boolean;
  children?: FileNode[];
  icon?: string;
}

export interface SampleInfo {
  folderName: string;
  sampleName: string;
  group: string;
  enabled: boolean;
}

export interface GroupTemplate {
  id: string;
  name: string;
  groups: string[];
  createdAt: Date;
}

// ========== Mock 数据 ==========

// 模拟"我的数据"目录结构
const mockFileTree: FileNode[] = [
  {
    key: '/mydata',
    title: '我的数据',
    path: '/mydata',
    isLeaf: false,
    icon: 'folder',
    children: [
      {
        key: '/mydata/single_cell',
        title: 'single_cell',
        path: '/mydata/single_cell',
        isLeaf: false,
        icon: 'folder',
        children: [
          {
            key: '/mydata/single_cell/pbmc_project',
            title: 'pbmc_project',
            path: '/mydata/single_cell/pbmc_project',
            isLeaf: false,
            icon: 'folder',
            children: [
              {
                key: '/mydata/single_cell/pbmc_project/sample_control_1',
                title: 'sample_control_1',
                path: '/mydata/single_cell/pbmc_project/sample_control_1',
                isLeaf: true,
                icon: 'file',
              },
              {
                key: '/mydata/single_cell/pbmc_project/sample_control_2',
                title: 'sample_control_2',
                path: '/mydata/single_cell/pbmc_project/sample_control_2',
                isLeaf: true,
                icon: 'file',
              },
              {
                key: '/mydata/single_cell/pbmc_project/sample_treatment_1',
                title: 'sample_treatment_1',
                path: '/mydata/single_cell/pbmc_project/sample_treatment_1',
                isLeaf: true,
                icon: 'file',
              },
              {
                key: '/mydata/single_cell/pbmc_project/sample_treatment_2',
                title: 'sample_treatment_2',
                path: '/mydata/single_cell/pbmc_project/sample_treatment_2',
                isLeaf: true,
                icon: 'file',
              },
            ],
          },
          {
            key: '/mydata/single_cell/liver_cancer',
            title: 'liver_cancer',
            path: '/mydata/single_cell/liver_cancer',
            isLeaf: false,
            icon: 'folder',
            children: [
              {
                key: '/mydata/single_cell/liver_cancer/tumor_1',
                title: 'tumor_1',
                path: '/mydata/single_cell/liver_cancer/tumor_1',
                isLeaf: true,
                icon: 'file',
              },
              {
                key: '/mydata/single_cell/liver_cancer/tumor_2',
                title: 'tumor_2',
                path: '/mydata/single_cell/liver_cancer/tumor_2',
                isLeaf: true,
                icon: 'file',
              },
              {
                key: '/mydata/single_cell/liver_cancer/normal_1',
                title: 'normal_1',
                path: '/mydata/single_cell/liver_cancer/normal_1',
                isLeaf: true,
                icon: 'file',
              },
              {
                key: '/mydata/single_cell/liver_cancer/normal_2',
                title: 'normal_2',
                path: '/mydata/single_cell/liver_cancer/normal_2',
                isLeaf: true,
                icon: 'file',
              },
            ],
          },
        ],
      },
      {
        key: '/mydata/bulk_rna',
        title: 'bulk_rna',
        path: '/mydata/bulk_rna',
        isLeaf: false,
        icon: 'folder',
        children: [
          {
            key: '/mydata/bulk_rna/experiment_1',
            title: 'experiment_1',
            path: '/mydata/bulk_rna/experiment_1',
            isLeaf: true,
            icon: 'file',
          },
        ],
      },
    ],
  },
];

// 模拟分组模板
const mockGroupTemplates: GroupTemplate[] = [
  {
    id: 'tpl_001',
    name: '对照-处理',
    groups: ['Control', 'Treatment'],
    createdAt: new Date('2026-01-20'),
  },
  {
    id: 'tpl_002',
    name: '肿瘤-正常',
    groups: ['Tumor', 'Normal'],
    createdAt: new Date('2026-01-22'),
  },
  {
    id: 'tpl_003',
    name: '时间序列',
    groups: ['Day0', 'Day3', 'Day7', 'Day14'],
    createdAt: new Date('2026-01-25'),
  },
];

// ========== 辅助函数 ==========

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// 递归查找节点
function findNode(tree: FileNode[], path: string): FileNode | null {
  for (const node of tree) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

// ========== API 函数 ==========

/**
 * 获取"我的数据"目录树
 */
export async function getMyDataTree(): Promise<FileNode[]> {
  await delay(200);
  return mockFileTree;
}

/**
 * 获取指定路径下的子文件夹（作为样本）
 */
export async function getSamplesInFolder(
  folderPath: string,
): Promise<SampleInfo[]> {
  await delay(150);

  const node = findNode(mockFileTree, folderPath);
  if (!node || !node.children) {
    return [];
  }

  // 只返回叶子节点作为样本
  return node.children
    .filter((child) => child.isLeaf)
    .map((child) => ({
      folderName: child.title,
      sampleName: child.title, // 默认使用文件夹名
      group: '',
      enabled: true,
    }));
}

/**
 * 获取所有分组模板
 */
export async function getGroupTemplates(): Promise<GroupTemplate[]> {
  await delay(100);
  return [...mockGroupTemplates].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

/**
 * 保存分组模板
 */
export async function saveGroupTemplate(
  name: string,
  groups: string[],
): Promise<GroupTemplate> {
  await delay(100);

  const template: GroupTemplate = {
    id: generateId(),
    name,
    groups,
    createdAt: new Date(),
  };

  mockGroupTemplates.push(template);
  return template;
}

/**
 * 删除分组模板
 */
export async function deleteGroupTemplate(id: string): Promise<boolean> {
  await delay(100);
  const index = mockGroupTemplates.findIndex((t) => t.id === id);
  if (index !== -1) {
    mockGroupTemplates.splice(index, 1);
    return true;
  }
  return false;
}
