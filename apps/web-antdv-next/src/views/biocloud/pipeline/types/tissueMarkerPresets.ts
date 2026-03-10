/**
 * 各组织类型常用细胞标志基因预设
 * 用于细胞注释步骤，根据用户选择的组织类型自动预填 Marker 基因
 */

export const TISSUE_MARKER_PRESETS: Record<string, string> = {
    pbmc: 'CD3D,CD3E,CD4,CD8A,CD8B,MS4A1,CD79A,CD14,LYZ,FCGR3A,NKG7,GNLY,PPBP,FCER1A',
    lung: 'EPCAM,KRT19,SFTPC,SFTPB,SCGB1A1,PECAM1,VWF,COL1A1,ACTA2,CD3D,CD68,MS4A1,KIT',
    liver: 'ALB,CYP3A4,APOB,KRT19,EPCAM,PECAM1,CD68,MARCO,CD3D,NKG7,ACTA2,PDGFRB',
    brain: 'RBFOX3,SLC17A7,GAD1,GAD2,AQP4,GFAP,MBP,MOG,CSF1R,CX3CR1,CLDN5,PDGFRB',
    tumor: 'EPCAM,KRT19,MKI67,CD3D,CD8A,CD4,FOXP3,CD68,CD163,PECAM1,ACTA2,FAP,COL1A1',
    gut: 'EPCAM,LGR5,MUC2,CHGA,DEFA5,CD3D,CD68,VWF,ACTA2,S100B,TPSAB1',
    kidney: 'SLC34A1,AQP1,AQP2,SLC12A1,NPHS2,PECAM1,CD3D,CD68,ACTA2,PDGFRB',
    skin: 'KRT14,KRT10,KRT1,COL1A1,PECAM1,CD3D,CD68,MLANA,PMEL,TPSAB1',
    other: '',
};

/**
 * 组织类型标签映射
 */
export const TISSUE_TYPE_OPTIONS = [
    { label: 'PBMC（外周血）', value: 'pbmc' },
    { label: '肺组织', value: 'lung' },
    { label: '肝组织', value: 'liver' },
    { label: '脑组织', value: 'brain' },
    { label: '肿瘤组织', value: 'tumor' },
    { label: '肠组织', value: 'gut' },
    { label: '肾组织', value: 'kidney' },
    { label: '皮肤组织', value: 'skin' },
    { label: '其他', value: 'other' },
];
