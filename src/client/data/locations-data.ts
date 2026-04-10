/**
 * @file locations-data.ts
 * @description Tramire continent location data with initial map coordinates.
 * Coordinates are percentages (0-100) relative to the map image dimensions.
 * Each location now includes an optional faction affiliation.
 */

import type { LocationData } from "../types/map-types";

// NOTE: Y coordinate convention — Y=0 is south, Y=100 is north (higher Y = further north/up on map).
// Markers render at top=(100-y)% so that higher Y values appear higher on screen.
export const INITIAL_LOCATIONS: LocationData[] = [
  { id: "illorien-spine", name: "伊洛希恩山脉", nameLatin: "The Illorien Spine", type: "natural", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "none", description: "特兰米尔大洲中部纵贯南北的巨大山脉，山脊如脊骨般层叠挺立，覆盖常青林。", x: 59.1, y: 62.6 },
  { id: "aelfen-alp", name: "艾尔芬峰", nameLatin: "Aelfen Alp", type: "natural", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "none", description: "伊洛希恩山脉的最高峰之一，神树所在之巅，岩壁陡峭，树根盘错，云气不散。", x: 67.3, y: 55.5 },
  { id: "aelfen-floating-isles", name: "艾尔芬浮空岛链", nameLatin: "The Aelfen Floating Isles", type: "natural", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "treant", description: "位于艾尔芬峰火山口上空的悬浮岛屿群，三大圣河的源头瀑布由此倾泻而下。", x: 68.9, y: 56.6 },
  { id: "tree-of-illoriel", name: "伊洛瑞尔神树", nameLatin: "The Tree of Illoriel", type: "sacred", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "none", description: "主干如山般粗壮，枝冠遮天蔽日，树根伸出三条河流。扎根于浮空岛链最大的主岛正中央。", x: 68.2, y: 58.5 },
  { id: "wulinda-ring", name: "乌林达林环", nameLatin: "Wulinda Primeval Ring", type: "natural", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "orc", description: "古林密布、灵气浓郁的原始林海，树木高耸入云，遮天蔽日，是兽人与根之脉树精的原初圣地。", x: 53.2, y: 57.6 },
  { id: "tree-sanix", name: "叶之树撒尼克斯", nameLatin: "Tree of Sanix", type: "sacred", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "none", description: "封印黑巫撒尼克斯的古木，直插云霄，枝繁叶茂，生机勃勃。位于艾尔芬峰山脚下、乌林达林环的边缘地带。", x: 59.3, y: 44 },
  { id: "aelfen-town", name: "艾尔芬镇", nameLatin: "Aelfen", type: "city", zone: "central_world_root_zone", zoneName: "中部 - 神树地带", faction: "human", description: "特兰米尔最热闹、最繁华的非王都聚落之一。镇中心的灵泉广场终年人潮涌动。整座城镇围绕着古老的根之树同心环状展开。", x: 58.2, y: 42.4 },
  { id: "elarath", name: "艾拉拉斯", nameLatin: "Elarath", type: "ruin", zone: "central_ancient_battlefield_zone", zoneName: "中部 - 古战场区", faction: "none", description: "圣岚古都，曾是魔法纪元时期文化与魔法中心，见证了禁咒魔法的施放，现为废墟遗迹。", x: 48.6, y: 48.2 },
  { id: "orindar", name: "奥林达尔", nameLatin: "Orindar", type: "ruin", zone: "central_ancient_battlefield_zone", zoneName: "中部 - 古战场区", faction: "none", description: "梅顿古都，城墙厚重、堡垒森严，曾是军国主义与兽人部族融合的起点，如今仅余断壁残垣。", x: 46.5, y: 64.6 },
  { id: "aurelen-valley", name: "奥蕊岚山谷", nameLatin: "Aurelen Valley", type: "natural", zone: "southern_aurelen_zone", zoneName: "南部 - 奥蕊岚", faction: "elvenbranch", description: "由三座环山包围的灵谷，泉水清澈，花藤交垂，气候四季如春。", x: 69.8, y: 34.2 },
  { id: "tree-valsir", name: "花之树瓦尔瑟尔", nameLatin: "Tree of Valsir", type: "sacred", zone: "southern_aurelen_zone", zoneName: "南部 - 奥蕊岚", faction: "none", description: "银干紫花，全年盛开，散发致幻孢子，封印着风/幻术黑巫瓦尔瑟尔的永恒梦境牢笼。", x: 71.1, y: 36.9 },
  { id: "thalanthir", name: "萨兰希尔", nameLatin: "Thalanthir", type: "city", zone: "southern_aurelen_zone", zoneName: "南部 - 奥蕊岚", faction: "elvenbranch", description: "枝裔族都城，宛如自然幻境，建筑与山林共生，是魔法与艺术的交响之都。", x: 69.9, y: 37.5 },
  { id: "sanlar-river", name: "圣岚河", nameLatin: "Sanlar River", type: "natural", zone: "southwestern_sanlar_kingdom", zoneName: "西南部 - 圣岚王国", faction: "none", description: "水势平稳、清澈见底，沿岸肥沃，是圣岚文明的母亲河。发源于神树南侧悬崖，蜿蜒穿越西南平原。", x: 45.7, y: 41.8 },
  { id: "glass-mangrove", name: "琉璃红树林海", nameLatin: "Crystal Mangrove Sea", type: "natural", zone: "southwestern_sanlar_kingdom", zoneName: "西南部 - 圣岚王国", faction: "none", description: "植物因魔力过载而结晶化的巨型湿地，枝叶如半透明的翡翠琉璃。", x: 30.2, y: 23.3 },
  { id: "veyra-port", name: "维罗港", nameLatin: "Veyra Port", type: "city", zone: "southwestern_sanlar_kingdom", zoneName: "西南部 - 圣岚王国", faction: "human", description: "圣岚王国的新都，拥有海上浮都之称的魔法重镇。城内以灰石塔楼与翠铜圆顶交错点缀，高塔林立的王宫伫立于峭壁之巅。", x: 33.1, y: 28.8 },
  { id: "sanlar-academy", name: "圣岚魔法学院", nameLatin: "Sanlar Magic Academy", type: "landmark", zone: "southwestern_sanlar_kingdom", zoneName: "西南部 - 圣岚王国", faction: "human", description: "全大陆最具影响力的魔法教育中心，培养博学、优雅的术士与法师。建于维罗港城市内部。", x: 34, y: 29.8 },
  { id: "silvaran", name: "西瓦兰港", nameLatin: "Silvaran", type: "city", zone: "southwestern_sanlar_kingdom", zoneName: "西南部 - 圣岚王国", faction: "human", description: "绿植环绕、港区高效，是圣岚最重要的外贸中转站。位于维岚运河的最南端出口，圣岚河的中游交汇处。", x: 42.4, y: 38.2 },
  { id: "merton-river", name: "梅顿河", nameLatin: "Merton River", type: "natural", zone: "northwestern_merton_kingdom", zoneName: "西北部 - 梅顿王国", faction: "none", description: "水流湍急，岩石嶙峋，沿岸多丘陵与矿脉。发源于神树西北侧，流经莱瑟顿后向西渗入静寂荒原地下。", x: 37.9, y: 64.9 },
  { id: "black-sap-taiga", name: "黑脂泰加林", nameLatin: "Black-Sap Taiga", type: "natural", zone: "northwestern_merton_kingdom", zoneName: "西北部 - 梅顿王国", faction: "none", description: "干燥北境的黑色针叶林，树木流淌着极易燃的黑色燃油，是工业命脉。", x: 35.4, y: 57.1 },
  { id: "lesserden", name: "莱瑟顿", nameLatin: "Lesserden", type: "city", zone: "northwestern_merton_kingdom", zoneName: "西北部 - 梅顿王国", faction: "human", description: "梅顿王国的新都，分为地上工业城与地下熔炉城两层结构，有钢铁之穴的称号。", x: 33.6, y: 67.8 },
  { id: "greymire", name: "灰泽镇", nameLatin: "Greymire", type: "city", zone: "northwestern_merton_kingdom", zoneName: "西北部 - 梅顿王国", faction: "human", description: "靠近沼泽地带，建筑简朴坚固，是防范南部入侵的军事要镇。", x: 41.5, y: 63.8 },
  { id: "veilrun-canal", name: "维岚运河", nameLatin: "The Veilrun Canal", type: "natural", zone: "canal_zone_lando_duchy", zoneName: "运河地带 - 兰多公国", faction: "none", description: "连接南北的商贸之脉，建于空根水道之上，河床是远古巨型气生根留下的木质外壳。", x: 40.2, y: 55.9 },
  { id: "meselia", name: "梅瑟利亚", nameLatin: "Meselia", type: "city", zone: "canal_zone_lando_duchy", zoneName: "运河地带 - 兰多公国", faction: "human", description: "兰多公国的核心城邦。完全悬建在空根水道两壁探出的巨型板状真菌之上。夜间荧光孢子充当路灯，充满繁华与生机。", x: 42.4, y: 48.4 },
  { id: "ashes-thorns", name: "灰棘山脉", nameLatin: "The Ashes Thorns", type: "natural", zone: "extreme_northwestern_wasteland", zoneName: "极西北部 - 西部荒原", faction: "none", description: "山如刺背、灰黑嶙峋，火山灰终年飘洒，岩浆地缝纵横，阻挡了海风。", x: 28.4, y: 55.2 },
  { id: "mount-seren", name: "瑟芮恩火山", nameLatin: "Mount Seren", type: "natural", zone: "extreme_northwestern_wasteland", zoneName: "极西北部 - 西部荒原", faction: "none", description: "山腹仍有赤焰燃动，火山口已成硫磺湖泊的沉睡火山。", x: 29.5, y: 65.8 },
  { id: "tree-seren", name: "果之树瑟芮恩", nameLatin: "Tree of Seren", type: "sacred", zone: "extreme_northwestern_wasteland", zoneName: "极西北部 - 西部荒原", faction: "none", description: "焦黑树干流淌着岩浆树脂，结出爆炸炎果，封印着火巫。生长于瑟芮恩火山顶部的硫磺湖泊正中心。", x: 30.2, y: 63.9 },
  { id: "varkhaz", name: "瓦尔卡兹", nameLatin: "Varkhaz", type: "city", zone: "extreme_northwestern_wasteland", zoneName: "极西北部 - 西部荒原", faction: "clawkin", description: "由裂爪族建立，隐于山脉深处，地形崎岖，布满黑铁锻造工坊，是一座由力量意志筑成的山城。", x: 26.1, y: 58.1 },
  { id: "iron-reef-archipelago", name: "铁礁群岛", nameLatin: "Iron-Reef Archipelago", type: "natural", zone: "northwestern_offshore_islands", zoneName: "西北部海面 - 铁礁群岛", faction: "none", description: "由无数含铁量极高的黑色岩石岛屿组成，磁场混乱，是走私犯与海盗的天然迷宫。", x: 17.4, y: 76.3 },
  { id: "lunareth", name: "月神溪", nameLatin: "Lunareth", type: "natural", zone: "lunar_creek_zone", zoneName: "沿神树区 - 月神溪地带", faction: "none", description: "细细如绢的溪流，自神树之巅南麓泻下，曲折东行，在凯拉韦节点后一分为二。", x: 64.9, y: 67.4 },
  { id: "caelave", name: "凯拉韦", nameLatin: "Caelave", type: "city", zone: "lunar_creek_zone", zoneName: "沿神树区 - 月神溪地带", faction: "elvenbranch", description: "溪流绕村而过，枝裔族风格的藤蔓吊楼与石砌屋舍交错分布，是文化融合的象征。位于月神溪的中游分叉点。", x: 69.8, y: 64.9 },
  { id: "greenveil-wood", name: "格林威尔林地", nameLatin: "Greenveil Wood", type: "natural", zone: "southeastern_forest_zone", zoneName: "东南部 - 密林地带", faction: "treant", description: "藤蔓交错，灵花遍地的灵性密林。占据整个东南大陆的大部分区域。", x: 77.5, y: 62.6 },
  { id: "moonfall-lake", name: "落月湖", nameLatin: "Moonfall Lake", type: "natural", zone: "southeastern_forest_zone", zoneName: "东南部 - 密林地带", faction: "treant", description: "湖水如镜，常有蓝白光华沉于湖底，每逢满月湖心会显神秘光圈。", x: 82.5, y: 51.8 },
  { id: "golden-mist-fens", name: "黄金雾沼", nameLatin: "Golden Mist Fens", type: "natural", zone: "northeastern_marsh_zone", zoneName: "东北部 - 沼泽地带", faction: "treant", description: "植被全为金黄色的湿地，水面漂浮金色落叶陷阱。", x: 74.1, y: 74.9 },
  { id: "kaedros-mire", name: "凯德罗斯之泽", nameLatin: "Kaedros Mire", type: "natural", zone: "northeastern_marsh_zone", zoneName: "东北部 - 沼泽地带", faction: "none", description: "瘴气沉沉的黑沼泽，泥水中常有亡魂啼哭，是特兰米尔最为诡异之地。", x: 77, y: 78.4 },
  { id: "black-tower", name: "黑塔", nameLatin: "The Black Tower", type: "landmark", zone: "northeastern_marsh_zone", zoneName: "东北部 - 沼泽地带", faction: "none", description: "塔身嵌满黑曜石，塔顶常年被雷霆包围，是禁忌之地。矗立于凯德罗斯之泽的正中央。", x: 77.4, y: 80.9 },
  { id: "root-bound-cliffs", name: "盘根断崖", nameLatin: "Root-Bound Cliffs", type: "natural", zone: "eastern_coast_abandoned_zone", zoneName: "东部沿海 - 废弃海岸地带", faction: "none", description: "高达数百米的灰白色木质悬崖，神树的一条巨型主根在此探入大海，海面下是沉船墓场。", x: 90.6, y: 74.8 },
  { id: "pale-strand", name: "白滩", nameLatin: "The Pale Strand", type: "natural", zone: "eastern_coast_abandoned_zone", zoneName: "东部沿海 - 废弃海岸地带", faction: "none", description: "没有沙子，铺满海滩的是白化的树精遗骸与神树枯枝，肃杀苍凉。", x: 90.7, y: 35.1 },
  { id: "rift-val-kareth", name: "瓦尔卡雷斯裂隙", nameLatin: "The Rift of Val'Kareth", type: "natural", zone: "forest_and_marsh_boundary_great_rift", zoneName: "密林和沼泽分界线 - 大裂隙", faction: "none", description: "宽达数公里的无底深渊，两侧崖壁布满横跨的神树根系。呈正西-正东走向横贯东部。", x: 80.6, y: 69.4 },
  { id: "river-aetheria", name: "以太利亚河", nameLatin: "River Aetheria", type: "natural", zone: "forest_and_marsh_boundary_great_rift", zoneName: "密林和沼泽分界线 - 大裂隙", faction: "none", description: "流淌着液态星光与极光的生命原液，触之即化为水晶。流淌于瓦尔卡雷斯裂隙的极深谷底。", x: 82.7, y: 68.9 },
  { id: "hanging-hives", name: "悬巢部落", nameLatin: "Hanging Hives", type: "city", zone: "forest_and_marsh_boundary_great_rift", zoneName: "密林和沼泽分界线 - 大裂隙", faction: "orc", description: "流亡兽人与变异树精在崖壁根系上挖掘洞穴、搭建吊脚楼组成的垂直村落，以打捞底部的原液为生。", x: 84.6, y: 68.6 },
];
