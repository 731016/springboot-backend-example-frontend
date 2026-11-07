// SPC 控制图计算工具（移植自 f:\spc-chart-demo\js\SPCCaculation.js 与 spc-echart.js 的判异规则）

export type SPCChartType =
  | 'MEAN_RANGE_CHART'
  | 'MEAN_SIGMA_CHART'
  | 'INDIVIDUAL_RANGE_CHART'
  | 'I_MR_R/S'
  | 'MEAN_RANGE_RAINBOW_CHART'
  | 'FRACTION_DEFECTIVE_PARTS_CHART';

export const SPC_CHART_LABEL: Record<SPCChartType, string> = {
  MEAN_RANGE_RAINBOW_CHART: '彩虹图',
  MEAN_RANGE_CHART: 'Xbar-R 图',
  MEAN_SIGMA_CHART: 'Xbar-S 图',
  INDIVIDUAL_RANGE_CHART: '单值移动极差图（I-MR）',
  'I_MR_R/S': '三项控制图（I-MR-R/S）',
  FRACTION_DEFECTIVE_PARTS_CHART: '不良率图（p）',
};

/** 下拉展示顺序（与 demo 画廊一致） */
export const SPC_CHART_ORDER: SPCChartType[] = [
  'MEAN_RANGE_RAINBOW_CHART',
  'MEAN_RANGE_CHART',
  'MEAN_SIGMA_CHART',
  'INDIVIDUAL_RANGE_CHART',
  'I_MR_R/S',
  'FRACTION_DEFECTIVE_PARTS_CHART',
];

export interface SPCRuleDef {
  key: string;
  label: string;
  param1?: number;
  param2?: number;
}

/** R1~R8 判异规则定义（参数沿用 demo 默认值） */
export const SPC_RULE_DEFS: SPCRuleDef[] = [
  { key: 'R1', label: 'R1：1 个点落在 A 区以外（超出 ±3σ）' },
  { key: 'R2', label: 'R2：连续 9 个点落在中心线同一侧', param1: 9 },
  { key: 'R3', label: 'R3：连续 6 个点递增或递减', param1: 6 },
  { key: 'R4', label: 'R4：连续 14 个点交替上下', param1: 14 },
  {
    key: 'R5',
    label: 'R5：连续 3 个点中有 2 个点落在中心线同一侧的 B 区以外',
    param1: 3,
    param2: 2,
  },
  {
    key: 'R6',
    label: 'R6：连续 5 个点中有 4 个点落在中心线同一侧的 C 区以外',
    param1: 5,
    param2: 4,
  },
  { key: 'R7', label: 'R7：连续 15 个点落在中心线两侧的 C 区内', param1: 15 },
  {
    key: 'R8',
    label: 'R8：连续 8 个点落在中心线两侧且无一在 C 区内',
    param1: 8,
  },
];

export const DEFAULT_SPC_RULE_KEYS: string[] = SPC_RULE_DEFS.map(
  (rule) => rule.key,
);

/** 违反判异规则的点统一标红 */
const VIOLATION_COLOR = '#f5222d';

/** 判异规则可覆盖的参数（未配置时使用 SPC_RULE_DEFS 默认值） */
export type SPCRuleParams = Record<
  string,
  { param1?: number; param2?: number }
>;

export interface SPCRuleConfig {
  keys: string[];
  params: SPCRuleParams;
}

/** 解析点位配置的规则 JSON，支持 ["R1"] 与 [{ key, param1, param2 }] 两种格式 */
export function parseSpcRuleConfig(config?: string): SPCRuleConfig {
  const fallback: SPCRuleConfig = { keys: DEFAULT_SPC_RULE_KEYS, params: {} };
  if (!config) return fallback;
  try {
    const parsed = JSON.parse(config);
    if (!Array.isArray(parsed)) return fallback;
    const keys: string[] = [];
    const params: SPCRuleParams = {};
    parsed.forEach((item) => {
      const key = typeof item === 'string' ? item : item?.key;
      if (
        typeof key !== 'string' ||
        !SPC_RULE_DEFS.some((def) => def.key === key)
      ) {
        return;
      }
      keys.push(key);
      if (item && typeof item === 'object') {
        const param1 = Number(item.param1);
        const param2 = Number(item.param2);
        const current = params[key] ?? {};
        if (Number.isFinite(param1) && param1 > 0) {
          current.param1 = param1;
        }
        if (Number.isFinite(param2) && param2 > 0) {
          current.param2 = param2;
        }
        if (current.param1 !== undefined || current.param2 !== undefined) {
          params[key] = current;
        }
      }
    });
    return keys.length > 0 ? { keys, params } : fallback;
  } catch (_e) {
    return fallback;
  }
}

/** 解析点位配置的规则 JSON；空值/非法值回退为全部规则 */
export function parseSpcRuleKeys(config?: string): string[] {
  return parseSpcRuleConfig(config).keys;
}

export interface SPCInput {
  values: number[];
  times: number[];
  groupSize: number;
  ruleKeys: string[];
  /** 判异规则参数覆盖值 */
  ruleParams?: SPCRuleParams;
  usl?: number;
  lsl?: number;
}

export interface SPCLine {
  cl: number;
  ucl: number;
  lcl: number;
}

export interface SPCPoint {
  y: number;
  ruleLabels: string[];
  color?: string;
}

export interface SPCChartSeries {
  name: string;
  line: SPCLine;
  points: SPCPoint[];
  /** 在 category 轴上的起始偏移（移动极差图比原始点少 1 个） */
  offset: number;
}

export interface SPCGroup {
  values: number[];
  mean: number;
  range: number;
  stdev: number;
  p?: number;
}

export interface SPCResult {
  xLabels: string[];
  groups: SPCGroup[];
  seriesList: SPCChartSeries[];
  rainbow?: { bins: string[]; counts: number[]; normal: number[] };
  /** 点位配置的规格限，仅用于展示与能力分析，不作为控制限参与判异 */
  spec?: { usl?: number; lsl?: number };
  capability?: {
    cp?: number;
    cpk?: number;
    pp?: number;
    ppk?: number;
    mean: number;
    sigmaWithin: number;
    sigmaOverall: number;
  };
  warning?: string;
  stats: {
    groupCount: number;
    groupSize: number;
    violationCount: number;
    outOfSpecCount: number;
  };
}

// ---------- 数值工具 ----------

function roundTo(value: number, digits: number): number {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, value) => sum + value, 0) / arr.length;
}

/** 样本标准差（n-1） */
function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance =
    arr.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function movingRanges(arr: number[]): number[] {
  const ranges: number[] = [];
  for (let i = 1; i < arr.length; i += 1) {
    ranges.push(Math.abs(arr[i] - arr[i - 1]));
  }
  return ranges;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// ---------- SPC 常数（对齐 SPCCaculation.js） ----------

const D2_TABLE: Record<number, number> = {
  1: 1.128,
  2: 1.128,
  3: 1.693,
  4: 2.059,
  5: 2.326,
  6: 2.534,
  7: 2.704,
  8: 2.847,
  9: 2.97,
  10: 3.078,
  11: 3.173,
  12: 3.258,
  13: 3.336,
  14: 3.407,
  15: 3.472,
  16: 3.532,
  17: 3.588,
  18: 3.64,
  19: 3.689,
  20: 3.735,
  21: 3.778,
  22: 3.819,
  23: 3.858,
  24: 3.895,
  25: 3.931,
  26: 3.964,
  27: 3.997,
  28: 4.027,
  29: 4.057,
  30: 4.086,
  31: 4.113,
  32: 4.139,
  33: 4.165,
  34: 4.189,
  35: 4.213,
  36: 4.236,
  37: 4.259,
  38: 4.28,
  39: 4.301,
  40: 4.322,
  41: 4.341,
  42: 4.361,
  43: 4.379,
  44: 4.398,
  45: 4.415,
  46: 4.433,
  47: 4.45,
  48: 4.466,
  49: 4.482,
  50: 4.498,
};

const D3_TABLE: Record<number, number> = {
  2: 0.8525,
  3: 0.8884,
  4: 0.8798,
  5: 0.8641,
  6: 0.848,
  7: 0.8332,
  8: 0.8198,
  9: 0.8078,
  10: 0.7971,
  11: 0.7873,
  12: 0.7785,
  13: 0.7704,
  14: 0.763,
  15: 0.7562,
  16: 0.7499,
  17: 0.7441,
  18: 0.7386,
  19: 0.7335,
  20: 0.7287,
  21: 0.7242,
  22: 0.7199,
  23: 0.7159,
  24: 0.7121,
  25: 0.7084,
};

const C4_TABLE: Record<number, number> = {
  1: 0.7979,
  2: 0.7979,
  3: 0.8862,
  4: 0.9213,
  5: 0.94,
  6: 0.9515,
  7: 0.9594,
  8: 0.965,
  9: 0.9693,
  10: 0.9727,
  11: 0.9754,
  12: 0.9776,
  13: 0.9794,
  14: 0.9811,
  15: 0.9823,
  16: 0.9835,
  17: 0.9845,
  18: 0.9854,
  19: 0.9862,
  20: 0.9869,
  21: 0.9876,
  22: 0.9882,
  23: 0.9887,
  24: 0.9892,
  25: 0.9896,
};

function d2(sampleSize: number): number {
  const size = Math.max(1, Math.round(sampleSize));
  if (D2_TABLE[size]) return D2_TABLE[size];
  const fitted = 3.4873 + 0.0250141 * size - 0.00009823 * size * size;
  return roundTo(fitted, 3);
}

function d3(sampleSize: number): number {
  const size = Math.max(2, Math.round(sampleSize));
  if (D3_TABLE[size]) return D3_TABLE[size];
  const fitted =
    0.80818 -
    0.0051871 * size +
    0.00005098 * size ** 2 +
    0.00000019 * size ** 3;
  return roundTo(fitted, 3);
}

function c4(sampleSize: number): number {
  const size = Math.max(1, Math.round(sampleSize));
  if (C4_TABLE[size]) return C4_TABLE[size];
  return roundTo((4 * (size - 1)) / (4 * size - 3), 4);
}

function c5(sampleSize: number): number {
  const value = c4(sampleSize);
  return Math.sqrt(Math.max(0, 1 - value * value));
}

// ---------- 判异规则 ----------

function evaluateRules(
  values: number[],
  line: SPCLine,
  ruleKeys: string[],
  ruleParams?: SPCRuleParams,
): Array<{ labels: string[]; color?: string }> {
  const sigma = (line.ucl - line.lcl) / 6;
  const zonesValid = sigma > 0 && Number.isFinite(sigma);
  const zone1Upper = line.cl + sigma;
  const zone1Lower = line.cl - sigma;
  const zone2Upper = line.cl + 2 * sigma;
  const zone2Lower = line.cl - 2 * sigma;
  const defs = SPC_RULE_DEFS.filter((def) => ruleKeys.includes(def.key));

  return values.map((value, index) => {
    const labels: string[] = [];

    for (const def of defs) {
      // 点位可覆盖规则参数，未配置时使用默认值
      const param1 = ruleParams?.[def.key]?.param1 ?? def.param1;
      const param2 = ruleParams?.[def.key]?.param2 ?? def.param2;
      if (def.key === 'R1') {
        if (value > line.ucl || value < line.lcl) labels.push(def.label);
        continue;
      }
      if (!zonesValid) continue;

      const window = (size: number) => {
        if (index < size - 1) return null;
        return values.slice(index - size + 1, index + 1);
      };

      if (def.key === 'R2') {
        const data = window(param1 ?? 9);
        if (!data) continue;
        const upper = data.every((item) => item > line.cl);
        const lower = data.every((item) => item < line.cl);
        if (upper || lower) labels.push(def.label);
      } else if (def.key === 'R3') {
        const data = window(param1 ?? 6);
        if (!data) continue;
        let rising = true;
        let falling = true;
        for (let i = 1; i < data.length; i += 1) {
          if (data[i] <= data[i - 1]) rising = false;
          if (data[i] >= data[i - 1]) falling = false;
        }
        if (rising || falling) labels.push(def.label);
      } else if (def.key === 'R4') {
        const data = window(param1 ?? 14);
        if (!data) continue;
        let alternation = 0;
        let direction = 0;
        for (let i = 1; i < data.length; i += 1) {
          const current =
            data[i] > data[i - 1] ? 1 : data[i] < data[i - 1] ? -1 : 0;
          if (current === 0 || current === direction) {
            alternation = 0;
            break;
          }
          direction = current;
          alternation += 1;
        }
        if (alternation === data.length - 1) labels.push(def.label);
      } else if (def.key === 'R5') {
        const data = window(param1 ?? 3);
        const need = param2 ?? 2;
        if (!data) continue;
        const upper = data.filter((item) => item > zone2Upper).length;
        const lower = data.filter((item) => item < zone2Lower).length;
        if (upper >= need || lower >= need) labels.push(def.label);
      } else if (def.key === 'R6') {
        const data = window(param1 ?? 5);
        const need = param2 ?? 4;
        if (!data) continue;
        const upper = data.filter((item) => item > zone1Upper).length;
        const lower = data.filter((item) => item < zone1Lower).length;
        if (upper >= need || lower >= need) labels.push(def.label);
      } else if (def.key === 'R7') {
        const data = window(param1 ?? 15);
        if (!data) continue;
        // Nelson R7：连续 N 点落在中心线两侧 ±1σ 内即可，不要求两侧都出现
        const inside = data.filter(
          (item) => item > zone1Lower && item < zone1Upper,
        ).length;
        if (inside === data.length) labels.push(def.label);
      } else if (def.key === 'R8') {
        const data = window(param1 ?? 8);
        if (!data) continue;
        const upper = data.filter((item) => item > zone1Upper).length;
        const lower = data.filter((item) => item < zone1Lower).length;
        if (upper + lower === data.length && upper > 0 && lower > 0)
          labels.push(def.label);
      }
    }

    return { labels, color: labels.length > 0 ? VIOLATION_COLOR : undefined };
  });
}

function buildSeries(
  name: string,
  values: number[],
  line: SPCLine,
  ruleKeys: string[],
  offset = 0,
  ruleParams?: SPCRuleParams,
): SPCChartSeries {
  const results = evaluateRules(values, line, ruleKeys, ruleParams);
  return {
    name,
    line,
    offset,
    points: values.map((value, index) => ({
      y: value,
      ruleLabels: results[index].labels,
      color: results[index].color,
    })),
  };
}

// ---------- 主入口 ----------

export function buildSPC(type: SPCChartType, input: SPCInput): SPCResult {
  const { values, times, ruleKeys, ruleParams } = input;
  const usl = input.usl ?? undefined;
  const lsl = input.lsl ?? undefined;
  const empty: SPCResult = {
    xLabels: [],
    groups: [],
    seriesList: [],
    stats: {
      groupCount: 0,
      groupSize: input.groupSize,
      violationCount: 0,
      outOfSpecCount: 0,
    },
  };

  if (values.length < 2) {
    return { ...empty, warning: '有效采集数据不足，无法绘制 SPC 控制图' };
  }

  const groupSize =
    type === 'INDIVIDUAL_RANGE_CHART' ? 1 : Math.max(1, input.groupSize || 5);
  const outOfSpecCount = values.filter(
    (value) =>
      (lsl !== undefined && value < lsl) || (usl !== undefined && value > usl),
  ).length;

  // 分组（丢弃尾部不足一组的记录）
  const groups: SPCGroup[] = [];
  const xLabels: string[] = [];
  for (let i = 0; i + groupSize <= values.length; i += groupSize) {
    const chunk = values.slice(i, i + groupSize);
    groups.push({
      values: chunk,
      mean: mean(chunk),
      range: Math.max(...chunk) - Math.min(...chunk),
      stdev: stdev(chunk),
    });
    xLabels.push(formatTime(times[i]));
  }

  const warnings: string[] = [];
  const dropped = values.length - groups.length * groupSize;
  if (dropped > 0) {
    warnings.push(`末尾 ${dropped} 条数据不足一个子组，已忽略`);
  }
  if (groups.length < 2) {
    warnings.push('完整子组不足 2 个，控制图仅供参考');
  }

  const allMeans = groups.map((group) => group.mean);
  const allRanges = groups.map((group) => group.range);
  const allStdevs = groups.map((group) => group.stdev);
  const meanAll = mean(allMeans);
  const stdevOverall = stdev(values);
  const rangeMean = mean(allRanges);
  const stdevMean = mean(allStdevs);

  const capabilityOf = (sigmaWithin: number) => {
    if (usl === undefined && lsl === undefined) return undefined;
    if (!Number.isFinite(sigmaWithin) || sigmaWithin <= 0) return undefined;
    const halfWidths: number[] = [];
    if (usl !== undefined) halfWidths.push((usl - meanAll) / (3 * sigmaWithin));
    if (lsl !== undefined) halfWidths.push((meanAll - lsl) / (3 * sigmaWithin));
    const cpk = Math.min(...halfWidths);
    const pp =
      stdevOverall > 0 && usl !== undefined && lsl !== undefined
        ? (usl - lsl) / (6 * stdevOverall)
        : undefined;
    const ppk =
      stdevOverall > 0
        ? Math.min(
            ...(usl !== undefined
              ? [(usl - meanAll) / (3 * stdevOverall)]
              : []),
            ...(lsl !== undefined
              ? [(meanAll - lsl) / (3 * stdevOverall)]
              : []),
          )
        : undefined;
    return {
      cp:
        usl !== undefined && lsl !== undefined && sigmaWithin > 0
          ? roundTo((usl - lsl) / (6 * sigmaWithin), 2)
          : undefined,
      cpk: roundTo(cpk, 2),
      pp: pp === undefined ? undefined : roundTo(pp, 2),
      ppk: ppk === undefined ? undefined : roundTo(ppk, 2),
      mean: roundTo(meanAll, 3),
      sigmaWithin: roundTo(sigmaWithin, 4),
      sigmaOverall: roundTo(stdevOverall, 4),
    };
  };

  let seriesList: SPCChartSeries[] = [];
  let rainbow: SPCResult['rainbow'];
  let capability: SPCResult['capability'];

  // 控制限始终由采集数据计算；点位配置的上下限作为规格限单独展示，
  // 避免把规格限当作控制限参与判异（否则 R2~R8 的统计含义会被破坏）
  if (type === 'FRACTION_DEFECTIVE_PARTS_CHART') {
    if (usl === undefined && lsl === undefined) {
      warnings.push('点位未配置上下限，无法统计不良率');
      return {
        ...empty,
        xLabels,
        groups,
        stats: {
          groupCount: groups.length,
          groupSize,
          violationCount: 0,
          outOfSpecCount,
        },
        warning: warnings.join('；'),
      };
    }
    const pValues = groups.map(
      (group) =>
        group.values.filter(
          (value) =>
            (lsl !== undefined && value < lsl) ||
            (usl !== undefined && value > usl),
        ).length / group.values.length,
    );
    pValues.forEach((value, index) => {
      groups[index].p = value;
    });
    const pBar = mean(pValues);
    const sigmaP = Math.sqrt(Math.max(0, (pBar * (1 - pBar)) / groupSize));
    const line: SPCLine = {
      cl: roundTo(pBar, 4),
      ucl: roundTo(Math.min(1, pBar + 3 * sigmaP), 4),
      lcl: roundTo(Math.max(0, pBar - 3 * sigmaP), 4),
    };
    // pBar 为 0 或 1 时 sigmaP 为 0，此时无法构造控制限，只展示点不做判异
    const noVariation = pBar <= 0 || pBar >= 1;
    if (noVariation) {
      warnings.push(
        pBar <= 0
          ? '本时段无不合格品，p 图控制限不可用，暂不判异'
          : '本时段全部为不合格品，p 图控制限不可用，暂不判异',
      );
    }
    seriesList = [
      buildSeries(
        '不合格率',
        pValues,
        line,
        noVariation ? [] : ['R1'],
        0,
        ruleParams,
      ),
    ];
  } else if (type === 'INDIVIDUAL_RANGE_CHART') {
    const mrValues = movingRanges(values);
    const mrMean = mean(mrValues);
    const sigma = mrMean / d2(1);
    const individualLine: SPCLine = {
      cl: roundTo(meanAll, 3),
      ucl: roundTo(meanAll + 3 * sigma, 3),
      lcl: roundTo(meanAll - 3 * sigma, 3),
    };
    const mrLine: SPCLine = {
      cl: roundTo(mrMean, 3),
      ucl: roundTo(mrMean + 3 * d3(2) * sigma, 3),
      lcl: roundTo(Math.max(0, mrMean - 3 * d3(2) * sigma), 3),
    };
    seriesList = [
      buildSeries('样本值', values, individualLine, ruleKeys, 0, ruleParams),
      buildSeries('样本极差', mrValues, mrLine, ruleKeys, 1, ruleParams),
    ];
    capability = capabilityOf(sigma);
  } else if (type === 'I_MR_R/S') {
    const mrMeans = movingRanges(allMeans);
    const mrMean = mean(mrMeans);
    const meanSigma = mrMean / d2(1);
    const meanLine: SPCLine = {
      cl: roundTo(meanAll, 3),
      ucl: roundTo(meanAll + 3 * meanSigma, 3),
      lcl: roundTo(meanAll - 3 * meanSigma, 3),
    };
    const mrLine: SPCLine = {
      cl: roundTo(mrMean, 3),
      ucl: roundTo(mrMean + 3 * d3(2) * meanSigma, 3),
      lcl: roundTo(Math.max(0, mrMean - 3 * d3(2) * meanSigma), 3),
    };
    const thirdValues = groupSize < 9 ? allRanges : allStdevs;
    const thirdSigma =
      groupSize < 9 ? rangeMean / d2(groupSize) : stdevMean / c4(groupSize);
    const thirdLine: SPCLine =
      groupSize < 9
        ? {
            cl: roundTo(rangeMean, 3),
            ucl: roundTo(rangeMean + 3 * thirdSigma * d3(groupSize), 3),
            lcl: roundTo(
              Math.max(0, rangeMean - 3 * thirdSigma * d3(groupSize)),
              3,
            ),
          }
        : {
            cl: roundTo(stdevMean, 3),
            ucl: roundTo(stdevMean + 3 * thirdSigma * c5(groupSize), 3),
            lcl: roundTo(
              Math.max(0, stdevMean - 3 * thirdSigma * c5(groupSize)),
              3,
            ),
          };
    seriesList = [
      buildSeries('子组均值', allMeans, meanLine, ruleKeys, 0, ruleParams),
      buildSeries('均值的移动极差', mrMeans, mrLine, ruleKeys, 1, ruleParams),
      buildSeries(
        groupSize < 9 ? '子组极差' : '子组标准差',
        thirdValues,
        thirdLine,
        ruleKeys,
        0,
        ruleParams,
      ),
    ];
    capability = capabilityOf(thirdSigma);
  } else if (type === 'MEAN_SIGMA_CHART') {
    const sigma = stdevMean / c4(groupSize);
    const meanLine: SPCLine = {
      cl: roundTo(meanAll, 3),
      ucl: roundTo(meanAll + (3 * sigma) / Math.sqrt(groupSize), 3),
      lcl: roundTo(meanAll - (3 * sigma) / Math.sqrt(groupSize), 3),
    };
    const sLine: SPCLine = {
      cl: roundTo(stdevMean, 3),
      ucl: roundTo(stdevMean + 3 * sigma * c5(groupSize), 3),
      lcl: roundTo(Math.max(0, stdevMean - 3 * sigma * c5(groupSize)), 3),
    };
    seriesList = [
      buildSeries('子组均值', allMeans, meanLine, ruleKeys, 0, ruleParams),
      buildSeries('子组标准差', allStdevs, sLine, ruleKeys, 0, ruleParams),
    ];
    capability = capabilityOf(sigma);
  } else if (type === 'MEAN_RANGE_RAINBOW_CHART') {
    const sigma = rainbowSigma(groups);
    const meanLine: SPCLine = {
      cl: roundTo(meanAll, 3),
      ucl: roundTo(meanAll + (3 * sigma) / Math.sqrt(groupSize), 3),
      lcl: roundTo(meanAll - (3 * sigma) / Math.sqrt(groupSize), 3),
    };
    seriesList = [
      buildSeries('子组均值', allMeans, meanLine, ruleKeys, 0, ruleParams),
    ];
    rainbow = buildRainbow(groups, sigma, meanLine);
    capability = capabilityOf(sigma);
  } else {
    // MEAN_RANGE_CHART
    const sigma = rangeMean / d2(groupSize);
    const meanLine: SPCLine = {
      cl: roundTo(meanAll, 3),
      ucl: roundTo(meanAll + (3 * sigma) / Math.sqrt(groupSize), 3),
      lcl: roundTo(meanAll - (3 * sigma) / Math.sqrt(groupSize), 3),
    };
    const rangeLine: SPCLine = {
      cl: roundTo(rangeMean, 3),
      ucl: roundTo(rangeMean + 3 * sigma * d3(groupSize), 3),
      lcl: roundTo(Math.max(0, rangeMean - 3 * sigma * d3(groupSize)), 3),
    };
    seriesList = [
      buildSeries('子组均值', allMeans, meanLine, ruleKeys, 0, ruleParams),
      buildSeries('子组极差', allRanges, rangeLine, ruleKeys, 0, ruleParams),
    ];
    capability = capabilityOf(sigma);
  }

  const violationCount = seriesList.reduce(
    (total, series) =>
      total +
      series.points.filter((point) => point.ruleLabels.length > 0).length,
    0,
  );

  return {
    xLabels,
    groups,
    seriesList,
    rainbow,
    spec:
      type === 'FRACTION_DEFECTIVE_PARTS_CHART'
        ? undefined
        : usl !== undefined || lsl !== undefined
          ? { usl, lsl }
          : undefined,
    capability,
    warning: warnings.length > 0 ? warnings.join('；') : undefined,
    stats: {
      groupCount: groups.length,
      groupSize,
      violationCount,
      outOfSpecCount,
    },
  };
}

/** 彩虹图组内标准差：各子组标准差的均值 / C4(n)，n 为子组大小 */
function rainbowSigma(groups: SPCGroup[]): number {
  if (groups.length === 0) return 0;
  const subgroupSize = groups[0].values.length;
  if (subgroupSize < 2) return 0;
  const subgroupStdevs = groups
    .filter((group) => group.values.length === subgroupSize)
    .map((group) => stdev(group.values));
  if (subgroupStdevs.length === 0) return 0;
  return mean(subgroupStdevs) / c4(subgroupSize);
}

/** 彩虹图分布直方图（bin 宽度 σ/2） */
function buildRainbow(
  groups: SPCGroup[],
  sigma: number,
  line: SPCLine,
): { bins: string[]; counts: number[]; normal: number[] } {
  const rawValues = groups.flatMap((group) => group.values);
  if (rawValues.length === 0) return { bins: [], counts: [], normal: [] };
  const min = Math.min(...rawValues);
  const max = Math.max(...rawValues);
  let step = sigma > 0 ? sigma / 2 : (max - min) / 6;
  if (!Number.isFinite(step) || step <= 0) step = max - min || 1;
  const binCount = Math.max(
    1,
    Math.min(30, Math.ceil((max - min) / step) || 1),
  );
  const binWidth = (max - min) / binCount || step;
  const counts = new Array(binCount).fill(0);
  rawValues.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor((value - min) / binWidth));
    counts[index] += 1;
  });
  const bins = counts.map((_, index) =>
    roundTo(min + binWidth * (index + 0.5), 2).toString(),
  );
  const normal = bins.map((bin) => {
    const x = Number(bin);
    if (sigma <= 0) return 0;
    const density =
      (1 / (sigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-((x - line.cl) ** 2) / (2 * sigma ** 2));
    return roundTo(density * rawValues.length * binWidth, 3);
  });
  return { bins, counts, normal };
}
