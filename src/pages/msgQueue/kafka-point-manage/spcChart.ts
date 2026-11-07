// SPC 控制图 ECharts option 构建（对齐 f:\spc-chart-demo 的图型布局，改写为 ECharts 6 语法）
import type { EChartsOption } from 'echarts';
import type {
  SPCChartSeries,
  SPCChartType,
  SPCGroup,
  SPCResult,
} from './spc';

const POINT_COLOR = '#2f9e44';
const LINE_COLOR = '#333333';
const UCL_COLOR = '#f5222d';
const CL_COLOR = '#fa8c16';
const LCL_COLOR = '#4ed2f4';
const SPEC_COLOR = '#722ed1';

const CONTROL_LINE_STYLE = { width: 1.5, type: 'dashed' as const };

export function getSPCChartHeight(type: SPCChartType): number {
  switch (type) {
    case 'I_MR_R/S':
      return 700;
    case 'MEAN_RANGE_RAINBOW_CHART':
      return 520;
    case 'FRACTION_DEFECTIVE_PARTS_CHART':
      return 420;
    default:
      return 520;
  }
}

function formatValue(value: number, type: SPCChartType): string {
  if (type === 'FRACTION_DEFECTIVE_PARTS_CHART') return value.toFixed(4);
  if (Math.abs(value) >= 100) return value.toFixed(2);
  return value.toFixed(3);
}

function markLineOf(
  line: { cl: number; ucl: number; lcl: number },
  type: SPCChartType,
) {
  const data: any[] = [
    {
      name: `UCL=${formatValue(line.ucl, type)}`,
      yAxis: line.ucl,
      lineStyle: { ...CONTROL_LINE_STYLE, color: UCL_COLOR },
      label: {
        position: 'insideEndTop',
        formatter: '{b}',
        fontSize: 10,
        color: UCL_COLOR,
      },
    },
    {
      name: `CL=${formatValue(line.cl, type)}`,
      yAxis: line.cl,
      lineStyle: { ...CONTROL_LINE_STYLE, color: CL_COLOR },
      label: {
        position: 'insideEndTop',
        formatter: '{b}',
        fontSize: 10,
        color: CL_COLOR,
      },
    },
    {
      name: `LCL=${formatValue(line.lcl, type)}`,
      yAxis: line.lcl,
      lineStyle: { ...CONTROL_LINE_STYLE, color: LCL_COLOR },
      label: {
        position: 'insideEndBottom',
        formatter: '{b}',
        fontSize: 10,
        color: LCL_COLOR,
      },
    },
  ];
  return { silent: true, symbol: ['none', 'none'], data };
}

/** 规格限（USL/LSL）单独绘制，仅用于展示，不参与判异 */
function specMarkLineData(
  spec: SPCResult['spec'],
  line: { cl: number; ucl: number; lcl: number },
  type: SPCChartType,
) {
  if (!spec) return [];
  const entries: any[] = [];
  const append = (
    name: string,
    value: number | undefined,
    position: 'insideEndTop' | 'insideEndBottom',
  ) => {
    if (value === undefined || value === null) return;
    // 与控制线重合时避免重复绘制
    if (
      Math.abs(value - line.ucl) < 1e-9 ||
      Math.abs(value - line.lcl) < 1e-9
    ) {
      return;
    }
    entries.push({
      name: `${name}=${formatValue(value, type)}`,
      yAxis: value,
      lineStyle: { width: 1.2, type: 'solid' as const, color: SPEC_COLOR },
      label: {
        position,
        formatter: '{b}',
        fontSize: 10,
        color: SPEC_COLOR,
      },
    });
  };
  append('USL', spec.usl, 'insideEndTop');
  append('LSL', spec.lsl, 'insideEndBottom');
  return entries;
}

function seriesData(series: SPCChartSeries) {
  const padding = new Array(series.offset).fill(null);
  return [
    ...padding,
    ...series.points.map((point) => ({
      value: point.y,
      // 判异点标红并放大，便于快速定位异常
      symbolSize: point.ruleLabels.length > 0 ? 9 : 6,
      itemStyle: { color: point.color ?? POINT_COLOR },
      ruleLabels: point.ruleLabels,
    })),
  ];
}

/** 子组明细文案：展示该子组的原始样本与统计量 */
function subgroupDetail(group: SPCGroup, type: SPCChartType): string {
  const n = group.values.length;
  if (type === 'FRACTION_DEFECTIVE_PARTS_CHART') {
    const p = group.p ?? 0;
    return `<div style="color:#666;font-size:12px">子组明细：n=${n}，不合格率=${(
      p * 100
    ).toFixed(2)}%（不合格 ${Math.round(p * n)} 个）</div>`;
  }
  if (type === 'INDIVIDUAL_RANGE_CHART') {
    return `<div style="color:#666;font-size:12px">子组明细：n=1，样本值=${formatValue(
      group.values[0],
      type,
    )}</div>`;
  }
  const samples = group.values
    .map((value) => formatValue(value, type))
    .join(', ');
  return (
    `<div style="color:#666;font-size:12px">子组明细（n=${n}）：${samples}</div>` +
    `<div style="color:#666;font-size:12px">子组均值=${formatValue(
      group.mean,
      type,
    )}，极差=${formatValue(group.range, type)}，标准差=${formatValue(
      group.stdev,
      type,
    )}</div>`
  );
}

function baseTooltip(type: SPCChartType, groups?: SPCGroup[]) {
  return {
    trigger: 'axis' as const,
    axisPointer: { type: 'line' as const, link: [{ xAxisIndex: 'all' }] },
    formatter: (params: any) => {
      const list = Array.isArray(params) ? params : [params];
      if (list.length === 0) return '';
      const title = list[0].axisValueLabel ?? list[0].axisValue ?? '';
      const rows = list
        .filter((param: any) => param.value != null && param.value !== '-')
        .map((param: any) => {
          const value = Array.isArray(param.value)
            ? param.value[1]
            : param.value;
          const rules = param.data?.ruleLabels ?? [];
          const ruleText =
            rules.length > 0
              ? `<div style="color:#f5222d;font-size:12px">${rules.join('<br/>')}</div>`
              : '';
          return `<div>${param.marker ?? ''}${param.seriesName}: ${formatValue(
            Number(value),
            type,
          )}${ruleText}</div>`;
        });
      // 子组明细只跟随主值子图（seriesIndex 0）展示
      const main = list.find((param: any) => param.seriesIndex === 0);
      const group =
        main && groups && main.dataIndex >= 0
          ? groups[main.dataIndex]
          : undefined;
      const detail = group ? subgroupDetail(group, type) : '';
      return `<div style="font-weight:600;margin-bottom:4px">${title}</div>${rows.join('')}${detail}`;
    },
  };
}

function baseAxis(xLabels: string[], gridIndex: number, type: SPCChartType) {
  return {
    type: 'category' as const,
    gridIndex,
    data: xLabels,
    boundaryGap: false,
    axisLabel: {
      fontSize: 10,
      rotate: 45,
      hideOverlap: true,
      color: '#666',
    },
    axisLine: { lineStyle: { color: '#d9d9d9' } },
    axisTick: { alignWithLabel: true },
    splitLine: { show: false },
    name: type === 'FRACTION_DEFECTIVE_PARTS_CHART' ? '子组' : undefined,
    nameLocation: 'end' as const,
    nameGap: 8,
    nameTextStyle: { fontSize: 10, color: '#999' },
  };
}

/** 主值子图纵轴范围需覆盖控制线与规格限，避免线条被裁掉 */
function mainAxisRange(result: SPCResult) {
  const main = result.seriesList[0];
  if (!main) return undefined;
  const values = main.points.map((point) => point.y);
  const low = Math.min(
    main.line.lcl,
    result.spec?.lsl ?? main.line.lcl,
    ...values,
  );
  const high = Math.max(
    main.line.ucl,
    result.spec?.usl ?? main.line.ucl,
    ...values,
  );
  if (!Number.isFinite(low) || !Number.isFinite(high)) return undefined;
  const pad = (high - low) * 0.04 || Math.abs(high) * 0.01 || 1;
  return { min: low - pad, max: high + pad };
}

function valueAxis(
  gridIndex: number,
  name?: string,
  min?: number,
  max?: number,
  unit?: string,
) {
  return {
    type: 'value' as const,
    gridIndex,
    scale: true,
    min,
    max,
    // 左侧纵轴标题：子组均值、样本值、子组极差、样本极差等；有单位时补充到标题中
    name: name ? (unit ? `${name}（${unit}）` : name) : undefined,
    nameLocation: 'middle' as const,
    nameGap: 46,
    nameTextStyle: { fontSize: 11, color: '#666' },
    axisLabel: { fontSize: 10, color: '#666' },
    splitLine: {
      show: true,
      lineStyle: { type: 'dashed' as const, color: '#eee' },
    },
  };
}

function layoutGrids(count: number, height: number, extraBottom = 60) {
  const topMargin = 12;
  const gap = 46;
  const usable = height - topMargin - extraBottom - gap * (count - 1);
  const each = Math.max(120, usable / count);
  return new Array(count).fill(0).map((_, index) => ({
    top: topMargin + index * (each + gap),
    height: each,
  }));
}

export function buildSPCOption(
  result: SPCResult,
  type: SPCChartType,
  height: number,
  unit?: string,
): EChartsOption {
  const xLabels = result.xLabels;
  const isRainbow = type === 'MEAN_RANGE_RAINBOW_CHART';
  // p 图主值为不合格率（无量纲），不拼接点位单位
  const axisUnit =
    type === 'FRACTION_DEFECTIVE_PARTS_CHART' ? undefined : unit;
  const grids = isRainbow
    ? [
        { left: 62, right: '26%', top: 12, bottom: 60, containLabel: true },
        { left: '76%', right: 30, top: 12, bottom: 60, containLabel: true },
      ]
    : layoutGrids(Math.max(1, result.seriesList.length), height);

  const series: any[] = result.seriesList.map((item, index) => {
    const isRainbowMain = isRainbow && index === 0;
    return {
      name: item.name,
      type: 'line',
      xAxisIndex: index,
      yAxisIndex: index,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 1, color: LINE_COLOR },
      itemStyle: { color: POINT_COLOR },
      connectNulls: false,
      data: seriesData(item),
      markLine: (() => {
        const base = isRainbowMain
          ? rainbowMarkLines(item.line, type)
          : markLineOf(item.line, type);
        // 规格限只绘制在主值子图（第一张图）上
        if (index !== 0) return base;
        return {
          ...base,
          data: [
            ...base.data,
            ...specMarkLineData(result.spec, item.line, type),
          ],
        };
      })(),
      ...(isRainbowMain ? { markArea: rainbowAreas(item.line) } : {}),
    };
  });

  // 彩虹图右侧分布直方图
  if (isRainbow && result.rainbow && result.rainbow.bins.length > 0) {
    series.push({
      name: '频数',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      barWidth: '100%',
      itemStyle: {
        color: 'rgba(47,158,68,0.35)',
        borderColor: '#2f9e44',
        borderWidth: 1,
      },
      data: result.rainbow.counts,
    });
    series.push({
      name: '正态曲线',
      type: 'line',
      xAxisIndex: 1,
      yAxisIndex: 1,
      symbol: 'circle',
      symbolSize: 3,
      showSymbol: true,
      itemStyle: { color: '#fa8c16' },
      lineStyle: { width: 1.5, color: '#fa8c16' },
      data: result.rainbow.normal,
    });
  }

  const xAxis: any[] = isRainbow
    ? [
        baseAxis(xLabels, 0, type),
        {
          type: 'value',
          gridIndex: 1,
          axisLabel: { fontSize: 9, color: '#999' },
          axisTick: { show: true },
          splitLine: { show: false },
          axisLine: { show: true, lineStyle: { color: '#bfbfbf' } },
        },
      ]
    : result.seriesList.map((_, index) => baseAxis(xLabels, index, type));

  // 彩虹图纵轴需覆盖 UCL/LCL 全部分区，避免 A/B/C 区被裁掉
  const rainbowAxisRange = (() => {
    const main = result.seriesList[0];
    if (!main) return undefined;
    const low = main.points.reduce(
      (min, point) => Math.min(min, point.y),
      Math.min(main.line.lcl, result.spec?.lsl ?? main.line.lcl),
    );
    const high = main.points.reduce(
      (max, point) => Math.max(max, point.y),
      Math.max(main.line.ucl, result.spec?.usl ?? main.line.ucl),
    );
    const pad = (high - low) * 0.04 || 1;
    return { min: low - pad, max: high + pad };
  })();

  const yAxis: any[] = isRainbow
    ? [
        valueAxis(
          0,
          result.seriesList[0]?.name,
          rainbowAxisRange?.min,
          rainbowAxisRange?.max,
          axisUnit,
        ),
        {
          type: 'category',
          gridIndex: 1,
          data: result.rainbow?.bins ?? [],
          axisLabel: { fontSize: 9, color: '#999' },
          axisTick: { show: true },
          axisLine: { show: true, lineStyle: { color: '#bfbfbf' } },
          splitLine: { show: false },
        },
      ]
    : result.seriesList.map((item, index) => {
        const range = index === 0 ? mainAxisRange(result) : undefined;
        return valueAxis(
          index,
          item.name,
          range?.min,
          range?.max,
          index === 0 ? axisUnit : undefined,
        );
      });

  const zoomAxisIndex = isRainbow
    ? [0]
    : result.seriesList.map((_, index) => index);

  return {
    animation: false,
    tooltip: baseTooltip(type, result.groups),
    grid: grids,
    xAxis,
    yAxis,
    dataZoom: [
      { type: 'inside', xAxisIndex: zoomAxisIndex },
      { type: 'slider', xAxisIndex: zoomAxisIndex, height: 20, bottom: 8 },
    ],
    series,
  } as EChartsOption;
}

/** 彩虹图 7 条分级控制线 */
function rainbowMarkLines(
  line: { cl: number; ucl: number; lcl: number },
  type: SPCChartType,
) {
  const sigma = (line.ucl - line.lcl) / 6;
  const entries = [
    {
      name: `UCL(3σ)=${formatValue(line.ucl, type)}`,
      value: line.ucl,
      color: UCL_COLOR,
    },
    {
      name: `2σ=${formatValue(line.cl + 2 * sigma, type)}`,
      value: line.cl + 2 * sigma,
      color: '#ff7875',
    },
    {
      name: `1σ=${formatValue(line.cl + sigma, type)}`,
      value: line.cl + sigma,
      color: '#ffa940',
    },
    {
      name: `XBAR=${formatValue(line.cl, type)}`,
      value: line.cl,
      color: CL_COLOR,
    },
    {
      name: `-1σ=${formatValue(line.cl - sigma, type)}`,
      value: line.cl - sigma,
      color: '#ffa940',
    },
    {
      name: `-2σ=${formatValue(line.cl - 2 * sigma, type)}`,
      value: line.cl - 2 * sigma,
      color: '#ff7875',
    },
    {
      name: `LCL(3σ)=${formatValue(line.lcl, type)}`,
      value: line.lcl,
      color: LCL_COLOR,
    },
  ];
  return {
    silent: true,
    symbol: ['none', 'none'],
    data: entries.map((entry) => ({
      name: entry.name,
      yAxis: entry.value,
      lineStyle: { width: 1, type: 'dashed' as const, color: entry.color },
      label: { show: false },
    })),
  };
}

/** 彩虹图 A/B/C 区带 */
function rainbowAreas(line: { cl: number; ucl: number; lcl: number }) {
  const sigma = (line.ucl - line.lcl) / 6;
  const zones = [
    {
      from: line.cl + 2 * sigma,
      to: line.ucl,
      name: 'A区',
      color: 'rgba(245,34,45,0.22)',
    },
    {
      from: line.lcl,
      to: line.cl - 2 * sigma,
      name: 'A区',
      color: 'rgba(245,34,45,0.22)',
    },
    {
      from: line.cl + sigma,
      to: line.cl + 2 * sigma,
      name: 'B区',
      color: 'rgba(250,173,20,0.26)',
    },
    {
      from: line.cl - 2 * sigma,
      to: line.cl - sigma,
      name: 'B区',
      color: 'rgba(250,173,20,0.26)',
    },
    {
      from: line.cl,
      to: line.cl + sigma,
      name: 'C区',
      color: 'rgba(82,196,26,0.22)',
    },
    {
      from: line.cl - sigma,
      to: line.cl,
      name: 'C区',
      color: 'rgba(82,196,26,0.22)',
    },
  ];
  return {
    silent: true,
    label: {
      show: true,
      position: 'insideLeft',
      distance: 10,
      color: '#595959',
      fontSize: 11,
      fontWeight: 'bold',
    },
    data: zones.map((zone) => [
      { name: zone.name, yAxis: zone.from, itemStyle: { color: zone.color } },
      { yAxis: zone.to },
    ]),
  };
}
