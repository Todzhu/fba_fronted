/**
 * 细胞类型 Marker 基因知识库
 *
 * 数据来源：
 * - scType (Nature Communications 2022): ScTypeDB_full.xlsx
 * - CellMarker 2.0 (Nucleic Acids Research 2023)
 * - PanglaoDB (Database of cell type markers)
 * - 经典文献中公认的 canonical markers
 *
 * 结构：species → tissue → cellType → { positive_markers, negative_markers? }
 */

export interface CellTypeMarkerEntry {
    /** 细胞类型名称 */
    cellType: string;
    /** 阳性标记基因（高表达） */
    positive: string[];
    /** 阴性标记基因（低表达/不表达，可选） */
    negative?: string[];
}

export interface TissueMarkers {
    /** 组织中文名 */
    label: string;
    /** 该组织下的细胞类型及其marker */
    cellTypes: CellTypeMarkerEntry[];
}

export interface SpeciesMarkers {
    [tissue: string]: TissueMarkers;
}

export interface MarkerDatabase {
    Human: SpeciesMarkers;
    Mouse: SpeciesMarkers;
}

// ============================================================
//  Marker 知识库主体
// ============================================================

export const CELL_TYPE_MARKER_DB: MarkerDatabase = {
    // ========================================================
    //  🧬 Human
    // ========================================================
    Human: {
        // -------------------- 免疫系统 --------------------
        Immune: {
            label: '免疫系统/PBMC',
            cellTypes: [
                { cellType: 'T cells', positive: ['CD3D', 'CD3E', 'CD3G', 'CD2'] },
                { cellType: 'CD4+ T cells', positive: ['CD3D', 'CD4', 'IL7R', 'MAL', 'LEF1'] },
                { cellType: 'CD8+ T cells', positive: ['CD3D', 'CD8A', 'CD8B', 'GZMK', 'GZMB'] },
                { cellType: 'Regulatory T cells', positive: ['FOXP3', 'IL2RA', 'CTLA4', 'IKZF2', 'TIGIT'] },
                { cellType: 'Naive T cells', positive: ['CCR7', 'LEF1', 'TCF7', 'SELL'] },
                { cellType: 'NK cells', positive: ['NKG7', 'GNLY', 'KLRD1', 'KLRB1', 'NCAM1', 'FCGR3A'], negative: ['CD3D'] },
                { cellType: 'B cells', positive: ['MS4A1', 'CD79A', 'CD79B', 'CD19', 'PAX5'] },
                { cellType: 'Plasma cells', positive: ['MZB1', 'SDC1', 'JCHAIN', 'IGHG1', 'XBP1'] },
                { cellType: 'CD14+ Monocytes', positive: ['CD14', 'LYZ', 'S100A8', 'S100A9', 'VCAN'] },
                { cellType: 'CD16+ Monocytes', positive: ['FCGR3A', 'MS4A7', 'LST1', 'IFITM3'] },
                { cellType: 'Macrophages', positive: ['CD68', 'CD163', 'MSR1', 'MARCO', 'MRC1'] },
                { cellType: 'Dendritic cells', positive: ['FCER1A', 'CLEC10A', 'CD1C', 'HLA-DRA', 'ITGAX'] },
                { cellType: 'pDC', positive: ['LILRA4', 'IL3RA', 'CLEC4C', 'IRF7', 'TCF4'] },
                { cellType: 'Platelets', positive: ['PPBP', 'PF4', 'GP9', 'ITGA2B'] },
                { cellType: 'Neutrophils', positive: ['CSF3R', 'FCGR3B', 'CXCR2', 'S100A8', 'S100A9', 'G0S2'] },
                { cellType: 'Mast cells', positive: ['KIT', 'TPSAB1', 'TPSB2', 'CPA3', 'HPGDS'] },
                { cellType: 'γδ T cells', positive: ['TRDC', 'TRGC1', 'TRGC2'] },
            ],
        },

        // -------------------- 肺 --------------------
        Lung: {
            label: '肺组织',
            cellTypes: [
                { cellType: 'AT1 (Alveolar Type I)', positive: ['AGER', 'PDPN', 'AQP5', 'HOPX', 'CAV1'] },
                { cellType: 'AT2 (Alveolar Type II)', positive: ['SFTPC', 'SFTPB', 'SFTPA1', 'ABCA3', 'LAMP3'] },
                { cellType: 'Ciliated cells', positive: ['FOXJ1', 'PIFO', 'TPPP3', 'CAPS', 'SNTN'] },
                { cellType: 'Club cells', positive: ['SCGB1A1', 'SCGB3A1', 'CYP2F1'] },
                { cellType: 'Basal cells', positive: ['KRT5', 'KRT17', 'TP63', 'DAPL1'] },
                { cellType: 'Goblet cells', positive: ['MUC5AC', 'MUC5B', 'SPDEF', 'TFF3'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CDH5', 'CLDN5', 'ERG'] },
                { cellType: 'Fibroblasts', positive: ['COL1A1', 'COL1A2', 'DCN', 'LUM', 'VIM'] },
                { cellType: 'Smooth muscle cells', positive: ['ACTA2', 'MYH11', 'TAGLN', 'CNN1'] },
                { cellType: 'Pericytes', positive: ['PDGFRB', 'RGS5', 'NOTCH3', 'KCNJ8'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E', 'CD2'] },
                { cellType: 'B cells', positive: ['MS4A1', 'CD79A', 'CD19'] },
                { cellType: 'Macrophages', positive: ['CD68', 'MARCO', 'MSR1', 'MRC1'] },
                { cellType: 'NK cells', positive: ['NKG7', 'GNLY', 'KLRD1'] },
                { cellType: 'Mast cells', positive: ['KIT', 'TPSAB1', 'CPA3'] },
            ],
        },

        // -------------------- 肝脏 --------------------
        Liver: {
            label: '肝组织',
            cellTypes: [
                { cellType: 'Hepatocytes', positive: ['ALB', 'APOB', 'HP', 'TF', 'SERPINA1', 'TTR'] },
                { cellType: 'Cholangiocytes', positive: ['KRT19', 'KRT7', 'EPCAM', 'SOX9', 'SPP1'] },
                { cellType: 'Hepatic stellate cells', positive: ['ACTA2', 'PDGFRB', 'RGS5', 'COL1A1', 'LRAT'] },
                { cellType: 'LSECs', positive: ['PECAM1', 'LYVE1', 'CLEC4G', 'STAB2', 'FCN3'] },
                { cellType: 'Kupffer cells', positive: ['CD68', 'CD163', 'MARCO', 'VSIG4', 'TIMD4'] },
                { cellType: 'NK/NKT cells', positive: ['NKG7', 'GNLY', 'KLRD1', 'KLRB1'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E', 'CD2'] },
                { cellType: 'B cells', positive: ['MS4A1', 'CD79A', 'CD19'] },
                { cellType: 'Plasma cells', positive: ['MZB1', 'JCHAIN', 'IGHG1'] },
            ],
        },

        // -------------------- 肾脏 --------------------
        Kidney: {
            label: '肾组织',
            cellTypes: [
                { cellType: 'PT (Proximal tubule)', positive: ['SLC34A1', 'LRP2', 'CUBN', 'SLC5A12', 'ALDOB'] },
                { cellType: 'LOH (Loop of Henle)', positive: ['SLC12A1', 'UMOD', 'CLDN16'] },
                { cellType: 'DCT (Distal convoluted tubule)', positive: ['SLC12A3', 'TRPM6'] },
                { cellType: 'CD-PC (Collecting duct principal)', positive: ['AQP2', 'AQP3', 'FXYD4'] },
                { cellType: 'CD-IC (Collecting duct intercalated)', positive: ['ATP6V1B1', 'ATP6V0D2', 'SLC4A1', 'SLC26A4'] },
                { cellType: 'Podocytes', positive: ['NPHS1', 'NPHS2', 'PODXL', 'WT1', 'SYNPO'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'FLT1', 'KDR', 'EMCN'] },
                { cellType: 'Mesangial cells', positive: ['PDGFRB', 'ITGA8', 'GATA3'] },
                { cellType: 'Fibroblasts', positive: ['COL1A1', 'DCN', 'VIM'] },
                { cellType: 'Macrophages', positive: ['CD68', 'CD163', 'CSF1R'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E'] },
            ],
        },

        // -------------------- 脑 --------------------
        Brain: {
            label: '脑组织',
            cellTypes: [
                { cellType: 'Excitatory neurons', positive: ['SLC17A7', 'SATB2', 'NRGN', 'CAMK2A'] },
                { cellType: 'Inhibitory neurons', positive: ['GAD1', 'GAD2', 'SLC32A1'] },
                { cellType: 'Astrocytes', positive: ['AQP4', 'GFAP', 'SLC1A2', 'SLC1A3', 'ALDH1L1'] },
                { cellType: 'Oligodendrocytes', positive: ['MBP', 'PLP1', 'MOG', 'MAG', 'OLIG1'] },
                { cellType: 'OPC', positive: ['PDGFRA', 'CSPG4', 'OLIG2', 'SOX10'] },
                { cellType: 'Microglia', positive: ['CX3CR1', 'P2RY12', 'TMEM119', 'CSF1R', 'AIF1'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CLDN5', 'FLT1'] },
                { cellType: 'Pericytes', positive: ['PDGFRB', 'RGS5', 'NOTCH3'] },
            ],
        },

        // -------------------- 心脏 --------------------
        Heart: {
            label: '心脏组织',
            cellTypes: [
                { cellType: 'Cardiomyocytes', positive: ['TNNT2', 'MYH7', 'MYH6', 'ACTC1', 'MYL2'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CDH5', 'CLDN5'] },
                { cellType: 'Fibroblasts', positive: ['COL1A1', 'COL1A2', 'DCN', 'TCF21', 'PDGFRA'] },
                { cellType: 'Smooth muscle cells', positive: ['ACTA2', 'MYH11', 'TAGLN'] },
                { cellType: 'Pericytes', positive: ['PDGFRB', 'RGS5', 'ABCC9'] },
                { cellType: 'Macrophages', positive: ['CD68', 'CD163', 'LYZ'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E'] },
                { cellType: 'Adipocytes', positive: ['ADIPOQ', 'PLIN1', 'FABP4'] },
            ],
        },

        // -------------------- 胃肠道 --------------------
        GI_tract: {
            label: '胃肠道',
            cellTypes: [
                { cellType: 'Enterocytes', positive: ['FABP1', 'FABP2', 'ALPI', 'SLC26A3', 'VIL1'] },
                { cellType: 'Goblet cells', positive: ['MUC2', 'TFF3', 'CLCA1', 'SPDEF'] },
                { cellType: 'Paneth cells', positive: ['DEFA5', 'DEFA6', 'LYZ', 'REG3A'] },
                { cellType: 'Stem cells (LGR5+)', positive: ['LGR5', 'ASCL2', 'OLFM4', 'SOX9'] },
                { cellType: 'Enteroendocrine cells', positive: ['CHGA', 'CHGB', 'SYP', 'NEUROD1'] },
                { cellType: 'Tuft cells', positive: ['DCLK1', 'POU2F3', 'TRPM5', 'AVIL'] },
                { cellType: 'Smooth muscle cells', positive: ['ACTA2', 'MYH11', 'DES'] },
                { cellType: 'Fibroblasts', positive: ['COL1A1', 'COL1A2', 'DCN', 'VIM'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CDH5'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E'] },
                { cellType: 'B cells', positive: ['MS4A1', 'CD79A'] },
                { cellType: 'Macrophages', positive: ['CD68', 'CD163'] },
            ],
        },

        // -------------------- 胰腺 --------------------
        Pancreas: {
            label: '胰腺组织',
            cellTypes: [
                { cellType: 'Alpha cells', positive: ['GCG', 'IRX2', 'ARX', 'TTR'] },
                { cellType: 'Beta cells', positive: ['INS', 'IAPP', 'MAFA', 'NKX6-1', 'PDX1'] },
                { cellType: 'Delta cells', positive: ['SST', 'HHEX', 'RBP4'] },
                { cellType: 'PP cells', positive: ['PPY', 'SERTM1'] },
                { cellType: 'Epsilon cells', positive: ['GHRL', 'GHRLOS'] },
                { cellType: 'Acinar cells', positive: ['PRSS1', 'CPA1', 'CELA3A', 'PNLIP', 'AMY2A'] },
                { cellType: 'Ductal cells', positive: ['KRT19', 'CFTR', 'SOX9', 'MUC1', 'SPP1'] },
                { cellType: 'Stellate cells', positive: ['COL1A1', 'RGS5', 'PDGFRB'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CDH5'] },
            ],
        },

        // -------------------- 皮肤 --------------------
        Skin: {
            label: '皮肤组织',
            cellTypes: [
                { cellType: 'Keratinocytes (basal)', positive: ['KRT5', 'KRT14', 'TP63', 'ITGA6'] },
                { cellType: 'Keratinocytes (suprabasal)', positive: ['KRT1', 'KRT10', 'IVL', 'FLG'] },
                { cellType: 'Melanocytes', positive: ['TYRP1', 'DCT', 'PMEL', 'MLANA', 'MITF'] },
                { cellType: 'Fibroblasts', positive: ['COL1A1', 'COL1A2', 'DCN', 'LUM'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CDH5'] },
                { cellType: 'Langerhans cells', positive: ['CD207', 'CD1A', 'FCER1A'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E'] },
                { cellType: 'Mast cells', positive: ['KIT', 'TPSAB1', 'CPA3'] },
                { cellType: 'Sweat gland cells', positive: ['DCD', 'SCGB2A2'] },
                { cellType: 'Smooth muscle cells', positive: ['ACTA2', 'TAGLN'] },
            ],
        },

        // -------------------- 乳腺 --------------------
        Breast: {
            label: '乳腺组织',
            cellTypes: [
                { cellType: 'Luminal epithelial cells', positive: ['EPCAM', 'KRT8', 'KRT18', 'KRT19', 'ESR1'] },
                { cellType: 'Basal/myoepithelial cells', positive: ['KRT5', 'KRT14', 'TP63', 'ACTA2'] },
                { cellType: 'Fibroblasts', positive: ['COL1A1', 'COL1A2', 'DCN', 'PDGFRA'] },
                { cellType: 'Adipocytes', positive: ['ADIPOQ', 'PLIN1', 'FABP4'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF', 'CDH5'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E'] },
                { cellType: 'Macrophages', positive: ['CD68', 'CD163'] },
                { cellType: 'B cells', positive: ['MS4A1', 'CD79A'] },
            ],
        },

        // -------------------- 骨髓 --------------------
        BoneMarrow: {
            label: '骨髓',
            cellTypes: [
                { cellType: 'HSC', positive: ['CD34', 'KIT', 'THY1', 'CRHBP', 'AVP'] },
                { cellType: 'CMP', positive: ['CD34', 'CD38', 'MPO'] },
                { cellType: 'Erythroid progenitors', positive: ['GYPA', 'HBB', 'HBA1', 'GATA1', 'KLF1'] },
                { cellType: 'Megakaryocytes', positive: ['ITGA2B', 'PF4', 'GP9', 'PPBP'] },
                { cellType: 'Monocytes', positive: ['CD14', 'LYZ', 'S100A8', 'S100A9'] },
                { cellType: 'Neutrophil progenitors', positive: ['ELANE', 'MPO', 'AZU1', 'PRTN3'] },
                { cellType: 'B cell progenitors', positive: ['CD79A', 'PAX5', 'EBF1', 'CD19'] },
                { cellType: 'T cells', positive: ['CD3D', 'CD3E'] },
                { cellType: 'NK cells', positive: ['NKG7', 'GNLY', 'KLRD1'] },
                { cellType: 'Plasma cells', positive: ['MZB1', 'JCHAIN', 'SDC1'] },
            ],
        },

        // -------------------- 子宫/胎盘 --------------------
        Uterus: {
            label: '子宫/胎盘',
            cellTypes: [
                { cellType: 'Extravillous trophoblast', positive: ['HLA-G', 'ITGA5', 'KRT7'] },
                { cellType: 'Syncytiotrophoblast', positive: ['CGA', 'CGB', 'TFAP2A', 'GCM1'] },
                { cellType: 'Decidual stromal cells', positive: ['PRL', 'IGFBP1', 'FOXO1'] },
                { cellType: 'Endometrial epithelium', positive: ['EPCAM', 'KRT18', 'MUC1'] },
                { cellType: 'Decidual NK cells', positive: ['NCAM1', 'CD160', 'GNLY'] },
                { cellType: 'Macrophages', positive: ['CD68', 'CD163'] },
                { cellType: 'Endothelial cells', positive: ['PECAM1', 'VWF'] },
            ],
        },
    },

    // ========================================================
    //  🐭 Mouse
    // ========================================================
    Mouse: {
        // -------------------- 免疫系统 --------------------
        Immune: {
            label: '免疫系统/脾脏',
            cellTypes: [
                { cellType: 'T cells', positive: ['Cd3d', 'Cd3e', 'Cd3g'] },
                { cellType: 'CD4+ T cells', positive: ['Cd3d', 'Cd4', 'Il7r'] },
                { cellType: 'CD8+ T cells', positive: ['Cd3d', 'Cd8a', 'Cd8b1', 'Gzmb'] },
                { cellType: 'Regulatory T cells', positive: ['Foxp3', 'Il2ra', 'Ctla4', 'Ikzf2'] },
                { cellType: 'NK cells', positive: ['Nkg7', 'Gzma', 'Klrb1c', 'Ncr1'], negative: ['Cd3d'] },
                { cellType: 'B cells', positive: ['Cd79a', 'Cd79b', 'Ms4a1', 'Cd19', 'Pax5'] },
                { cellType: 'Plasma cells', positive: ['Jchain', 'Mzb1', 'Sdc1', 'Xbp1'] },
                { cellType: 'Monocytes', positive: ['Ly6c2', 'Ccr2', 'Lyz2', 'Csf1r'] },
                { cellType: 'Macrophages', positive: ['Adgre1', 'Cd68', 'Fcgr1', 'Mrc1'] },
                { cellType: 'Dendritic cells', positive: ['Itgax', 'H2-Ab1', 'Flt3', 'Batf3'] },
                { cellType: 'pDC', positive: ['Siglech', 'Bst2', 'Irf7'] },
                { cellType: 'Neutrophils', positive: ['S100a8', 'S100a9', 'Ly6g', 'Retnlg', 'G0s2'] },
                { cellType: 'Mast cells', positive: ['Kit', 'Cpa3', 'Mcpt4', 'Fcer1a'] },
            ],
        },

        // -------------------- 肺 --------------------
        Lung: {
            label: '肺组织',
            cellTypes: [
                { cellType: 'AT1 (Alveolar Type I)', positive: ['Ager', 'Pdpn', 'Aqp5', 'Hopx'] },
                { cellType: 'AT2 (Alveolar Type II)', positive: ['Sftpc', 'Sftpb', 'Sftpa1', 'Abca3', 'Lamp3'] },
                { cellType: 'Ciliated cells', positive: ['Foxj1', 'Pifo', 'Tppp3'] },
                { cellType: 'Club cells', positive: ['Scgb1a1', 'Scgb3a1', 'Cyp2f2'] },
                { cellType: 'Basal cells', positive: ['Krt5', 'Trp63', 'Krt17'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Cdh5', 'Cldn5', 'Vwf'] },
                { cellType: 'Fibroblasts', positive: ['Col1a1', 'Col1a2', 'Dcn', 'Pdgfra'] },
                { cellType: 'Smooth muscle cells', positive: ['Acta2', 'Myh11', 'Tagln'] },
                { cellType: 'Pericytes', positive: ['Pdgfrb', 'Rgs5', 'Notch3'] },
                { cellType: 'Alveolar macrophages', positive: ['Mrc1', 'Marco', 'Siglecf', 'Cd68'] },
                { cellType: 'Interstitial macrophages', positive: ['Cd68', 'Cx3cr1', 'Csf1r'] },
                { cellType: 'T cells', positive: ['Cd3d', 'Cd3e'] },
                { cellType: 'B cells', positive: ['Cd79a', 'Ms4a1'] },
                { cellType: 'NK cells', positive: ['Nkg7', 'Klrb1c'] },
            ],
        },

        // -------------------- 肝脏 --------------------
        Liver: {
            label: '肝组织',
            cellTypes: [
                { cellType: 'Hepatocytes', positive: ['Alb', 'Apob', 'Serpina1c', 'Ttr', 'Hp'] },
                { cellType: 'Cholangiocytes', positive: ['Krt19', 'Krt7', 'Epcam', 'Sox9', 'Spp1'] },
                { cellType: 'Hepatic stellate cells', positive: ['Lrat', 'Rgs5', 'Pdgfrb', 'Col1a1'] },
                { cellType: 'LSECs', positive: ['Pecam1', 'Lyve1', 'Stab2', 'Clec4g'] },
                { cellType: 'Kupffer cells', positive: ['Adgre1', 'Clec4f', 'Timd4', 'Vsig4', 'Cd68'] },
                { cellType: 'NK/NKT cells', positive: ['Nkg7', 'Klrb1c', 'Gzma'] },
                { cellType: 'T cells', positive: ['Cd3d', 'Cd3e'] },
                { cellType: 'B cells', positive: ['Cd79a', 'Ms4a1'] },
            ],
        },

        // -------------------- 肾脏 --------------------
        Kidney: {
            label: '肾组织',
            cellTypes: [
                { cellType: 'PT (Proximal tubule)', positive: ['Slc34a1', 'Lrp2', 'Slc5a12'] },
                { cellType: 'LOH (Loop of Henle)', positive: ['Slc12a1', 'Umod'] },
                { cellType: 'DCT (Distal convoluted tubule)', positive: ['Slc12a3', 'Trpm6'] },
                { cellType: 'CD-PC (Collecting duct principal)', positive: ['Aqp2', 'Aqp3', 'Fxyd4'] },
                { cellType: 'CD-IC (Collecting duct intercalated)', positive: ['Atp6v1b1', 'Slc4a1', 'Slc26a4'] },
                { cellType: 'Podocytes', positive: ['Nphs1', 'Nphs2', 'Wt1', 'Podxl'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Flt1', 'Kdr', 'Emcn'] },
                { cellType: 'Fibroblasts', positive: ['Col1a1', 'Dcn', 'Vim'] },
                { cellType: 'Macrophages', positive: ['Adgre1', 'Cd68', 'Csf1r'] },
            ],
        },

        // -------------------- 脑 --------------------
        Brain: {
            label: '脑组织',
            cellTypes: [
                { cellType: 'Excitatory neurons', positive: ['Slc17a7', 'Satb2', 'Nrgn', 'Camk2a'] },
                { cellType: 'Inhibitory neurons', positive: ['Gad1', 'Gad2', 'Slc32a1'] },
                { cellType: 'Astrocytes', positive: ['Aqp4', 'Gfap', 'Slc1a2', 'Slc1a3', 'Aldh1l1'] },
                { cellType: 'Oligodendrocytes', positive: ['Mbp', 'Plp1', 'Mog', 'Mag'] },
                { cellType: 'OPC', positive: ['Pdgfra', 'Cspg4', 'Olig2'] },
                { cellType: 'Microglia', positive: ['Cx3cr1', 'P2ry12', 'Tmem119', 'Csf1r', 'Aif1'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Cldn5', 'Flt1'] },
                { cellType: 'Pericytes', positive: ['Pdgfrb', 'Rgs5'] },
            ],
        },

        // -------------------- 心脏 --------------------
        Heart: {
            label: '心脏组织',
            cellTypes: [
                { cellType: 'Cardiomyocytes', positive: ['Tnnt2', 'Myh7', 'Myh6', 'Actc1'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Cdh5', 'Vwf'] },
                { cellType: 'Fibroblasts', positive: ['Col1a1', 'Col1a2', 'Dcn', 'Tcf21', 'Pdgfra'] },
                { cellType: 'Smooth muscle cells', positive: ['Acta2', 'Myh11', 'Tagln'] },
                { cellType: 'Pericytes', positive: ['Pdgfrb', 'Rgs5'] },
                { cellType: 'Macrophages', positive: ['Adgre1', 'Cd68', 'Lyz2'] },
            ],
        },

        // -------------------- 胃肠道 --------------------
        GI_tract: {
            label: '胃肠道',
            cellTypes: [
                { cellType: 'Enterocytes', positive: ['Fabp1', 'Fabp2', 'Alpi', 'Vil1'] },
                { cellType: 'Goblet cells', positive: ['Muc2', 'Tff3', 'Clca3', 'Spdef'] },
                { cellType: 'Paneth cells', positive: ['Defa17', 'Defa22', 'Lyz1', 'Ang4'] },
                { cellType: 'Stem cells (Lgr5+)', positive: ['Lgr5', 'Ascl2', 'Olfm4'] },
                { cellType: 'Enteroendocrine cells', positive: ['Chga', 'Chgb', 'Neurod1'] },
                { cellType: 'Tuft cells', positive: ['Dclk1', 'Pou2f3', 'Trpm5'] },
                { cellType: 'Smooth muscle cells', positive: ['Acta2', 'Myh11', 'Des'] },
                { cellType: 'Fibroblasts', positive: ['Col1a1', 'Col1a2', 'Dcn'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Cdh5'] },
                { cellType: 'Macrophages', positive: ['Adgre1', 'Cd68'] },
            ],
        },

        // -------------------- 胰腺 --------------------
        Pancreas: {
            label: '胰腺组织',
            cellTypes: [
                { cellType: 'Alpha cells', positive: ['Gcg', 'Irx2', 'Arx'] },
                { cellType: 'Beta cells', positive: ['Ins1', 'Ins2', 'Mafa', 'Nkx6-1', 'Pdx1'] },
                { cellType: 'Delta cells', positive: ['Sst', 'Hhex'] },
                { cellType: 'PP cells', positive: ['Ppy'] },
                { cellType: 'Acinar cells', positive: ['Prss2', 'Cela1', 'Cpa1', 'Amy2a5'] },
                { cellType: 'Ductal cells', positive: ['Krt19', 'Sox9', 'Cftr', 'Muc1'] },
                { cellType: 'Stellate cells', positive: ['Col1a1', 'Rgs5', 'Pdgfrb'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Cdh5'] },
            ],
        },

        // -------------------- 皮肤 --------------------
        Skin: {
            label: '皮肤组织',
            cellTypes: [
                { cellType: 'Keratinocytes (basal)', positive: ['Krt5', 'Krt14', 'Trp63'] },
                { cellType: 'Keratinocytes (suprabasal)', positive: ['Krt1', 'Krt10', 'Ivl', 'Flg'] },
                { cellType: 'Hair follicle stem cells', positive: ['Cd34', 'Krt15', 'Sox9', 'Lgr5'] },
                { cellType: 'Melanocytes', positive: ['Tyrp1', 'Dct', 'Pmel', 'Mlana'] },
                { cellType: 'Fibroblasts', positive: ['Col1a1', 'Col1a2', 'Dcn'] },
                { cellType: 'Endothelial cells', positive: ['Pecam1', 'Cdh5'] },
                { cellType: 'Langerhans cells', positive: ['Cd207', 'Cd74', 'H2-Ab1'] },
                { cellType: 'T cells', positive: ['Cd3d', 'Cd3e'] },
                { cellType: 'Mast cells', positive: ['Kit', 'Cpa3', 'Mcpt4'] },
            ],
        },

        // -------------------- 骨髓 --------------------
        BoneMarrow: {
            label: '骨髓',
            cellTypes: [
                { cellType: 'HSC', positive: ['Kit', 'Sca1', 'Cd34', 'Ly6a'] },
                { cellType: 'Erythroid progenitors', positive: ['Gypa', 'Hbb-bs', 'Hba-a1', 'Gata1', 'Klf1'] },
                { cellType: 'Megakaryocytes', positive: ['Itga2b', 'Pf4', 'Gp9', 'Ppbp'] },
                { cellType: 'Monocytes', positive: ['Ly6c2', 'Lyz2', 'Ccr2'] },
                { cellType: 'Neutrophil progenitors', positive: ['Elane', 'Mpo', 'Prtn3'] },
                { cellType: 'B cell progenitors', positive: ['Cd79a', 'Pax5', 'Ebf1'] },
                { cellType: 'NK cells', positive: ['Nkg7', 'Klrb1c'] },
            ],
        },
    },
};

// ============================================================
//  辅助函数
// ============================================================

/**
 * 获取某个物种所有可用组织列表
 */
export function getTissueOptions(species: 'Human' | 'Mouse') {
    const speciesData = CELL_TYPE_MARKER_DB[species];
    return Object.entries(speciesData).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));
}

/**
 * 获取某个组织下所有细胞类型及其 marker
 */
export function getCellTypesForTissue(
    species: 'Human' | 'Mouse',
    tissue: string,
): CellTypeMarkerEntry[] {
    return CELL_TYPE_MARKER_DB[species]?.[tissue]?.cellTypes || [];
}

/**
 * 获取某个组织下所有 positive marker 基因（去重，用于预填 Dotplot）
 */
export function getAllMarkersForTissue(
    species: 'Human' | 'Mouse',
    tissue: string,
): string[] {
    const cellTypes = getCellTypesForTissue(species, tissue);
    const markerSet = new Set<string>();
    for (const ct of cellTypes) {
        ct.positive.forEach((g) => markerSet.add(g));
    }
    return [...markerSet];
}

/**
 * 获取每个细胞类型的 top N 特征性 marker（取前 N 个 positive markers）
 */
export function getTopMarkersPerCellType(
    species: 'Human' | 'Mouse',
    tissue: string,
    topN: number = 3,
): Record<string, string[]> {
    const cellTypes = getCellTypesForTissue(species, tissue);
    const result: Record<string, string[]> = {};
    for (const ct of cellTypes) {
        result[ct.cellType] = ct.positive.slice(0, topN);
    }
    return result;
}
