// Utility functions and constants for safety metrics evaluation
// Based on international SMS (Safety, Health, Environment) standards

// Risk thresholds for different safety metrics
export const RISK_THRESHOLDS = {
  // LTIFR - Lost Time Injury Frequency Rate (taxa_com_afastamento)
  LTIFR: {
    EXCELLENT: 2.0,
    ACCEPTABLE: 5.0,
    CONCERNING: 10.0,
    // > 10.0 is CRITICAL
  },
  
  // TRIFR - Total Recordable Injury Frequency Rate (total_incidentes_registraveis)
  TRIFR: {
    EXCELLENT: 5.0,
    ACCEPTABLE: 10.0,
    CONCERNING: 20.0,
    // > 20.0 is CRITICAL
  },
  
  // Severity Rate (gravidade)
  SEVERITY: {
    EXCELLENT: 50,
    ACCEPTABLE: 150,
    CONCERNING: 300,
    // > 300 is CRITICAL
  },
  
  // Fatalities - zero tolerance
  FATALITIES: {
    ZERO: 0,
    // ANY value > 0 is CRITICAL
  }
};

// Color classes for risk levels (using Bulma colors)
export const RISK_COLORS = {
  EXCELLENT: {
    bg: 'has-background-success-light',
    text: 'has-text-success-dark',
    border: 'has-border-success',
    tag: 'is-success',
    icon: '🟢'
  },
  ACCEPTABLE: {
    bg: 'has-background-warning-light',
    text: 'has-text-warning-dark',
    border: 'has-border-warning',
    tag: 'is-warning',
    icon: '🟡'
  },
  CONCERNING: {
    bg: 'has-background-danger-light',
    text: 'has-text-danger-dark',
    border: 'has-border-danger',
    tag: 'is-danger is-light',
    icon: '🟠'
  },
  CRITICAL: {
    bg: 'has-background-danger',
    text: 'has-text-white',
    border: 'has-border-danger',
    tag: 'is-danger',
    icon: '🔴'
  },
  ZERO_TOLERANCE: {
    bg: 'has-background-danger',
    text: 'has-text-white',
    border: 'has-border-danger',
    tag: 'is-danger',
    icon: '⚠️'
  }
};

// Chart.js color scheme for risk levels
export const CHART_COLORS = {
  EXCELLENT: 'rgba(72, 187, 120, 0.8)',      // Green
  ACCEPTABLE: 'rgba(246, 224, 94, 0.8)',     // Yellow
  CONCERNING: 'rgba(251, 146, 60, 0.8)',      // Orange
  CRITICAL: 'rgba(239, 68, 68, 0.8)',        // Red
  border: {
    EXCELLENT: 'rgba(34, 139, 34, 1)',
    ACCEPTABLE: 'rgba(218, 165, 32, 1)',
    CONCERNING: 'rgba(255, 140, 0, 1)',
    CRITICAL: 'rgba(220, 38, 38, 1)',
  }
};

/**
 * Determine risk level based on metric value and type
 * @param {number} value - The metric value
 * @param {string} metricType - Type of metric: 'LTIFR', 'TRIFR', 'SEVERITY', 'FATALITIES'
 * @returns {string} Risk level: 'EXCELLENT', 'ACCEPTABLE', 'CONCERNING', 'CRITICAL', 'ZERO_TOLERANCE'
 */
export const getRiskLevel = (value, metricType) => {
  const numValue = Number(value) || 0;
  
  if (metricType === 'FATALITIES') {
    return numValue > 0 ? 'ZERO_TOLERANCE' : 'EXCELLENT';
  }
  
  const thresholds = RISK_THRESHOLDS[metricType];
  if (!thresholds) return 'ACCEPTABLE';
  
  if (numValue <= thresholds.EXCELLENT) return 'EXCELLENT';
  if (numValue <= thresholds.ACCEPTABLE) return 'ACCEPTABLE';
  if (numValue <= thresholds.CONCERNING) return 'CONCERNING';
  return 'CRITICAL';
};

/**
 * Get color styling for a risk level
 * @param {number} value - The metric value
 * @param {string} metricType - Type of metric
 * @returns {object} Color styling object
 */
export const getRiskColor = (value, metricType) => {
  const level = getRiskLevel(value, metricType);
  return RISK_COLORS[level];
};

/**
 * Get chart color for a metric value
 * @param {number} value - The metric value
 * @param {string} metricType - Type of metric
 * @returns {string} Chart.js color
 */
export const getChartColor = (value, metricType) => {
  const level = getRiskLevel(value, metricType);
  return CHART_COLORS[level];
};

/**
 * Calculate trend between current and previous values
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @returns {object} Trend object with direction, percentage, and icon
 */
export const calculateTrend = (current, previous) => {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  
  if (prev === 0 && curr === 0) {
    return { direction: 'stable', percentage: 0, icon: '→', class: 'has-text-grey' };
  }
  
  if (prev === 0) {
    return { direction: 'up', percentage: 100, icon: '↗️', class: 'has-text-danger' };
  }
  
  const percentChange = ((curr - prev) / prev) * 100;
  
  if (Math.abs(percentChange) < 25) {
    return { 
      direction: 'stable', 
      percentage: percentChange.toFixed(1), 
      icon: '→', 
      class: 'has-text-grey' 
    };
  }
  
  if (percentChange > 0) {
    // For safety metrics, increase is bad (red)
    return { 
      direction: 'up', 
      percentage: percentChange.toFixed(1), 
      icon: '↗️', 
      class: 'has-text-danger' 
    };
  }
  
  // Decrease in safety metrics is good (green)
  return { 
    direction: 'down', 
    percentage: Math.abs(percentChange).toFixed(1), 
    icon: '↘️', 
    class: 'has-text-success' 
  };
};

/**
 * Format safety rate values for display
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted value
 */
export const formatSafetyRate = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 'N/A';
  return parsed.toFixed(decimals).replace('.', ',');
};

/**
 * Format numbers for display with thousand separators
 * @param {number} value - The value to format
 * @returns {string} Formatted value
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 'N/A';
  return new Intl.NumberFormat('pt-BR').format(parsed);
};

/**
 * Identify companies with critical safety issues
 * @param {Array} data - Array of company REM data
 * @returns {object} Critical issues categorized
 */
export const identifyCriticalIssues = (data) => {
  const issues = {
    fatalities: [],
    highLTIFR: [],
    highSeverity: [],
    deterioratingTrend: []
  };
  
  if (!Array.isArray(data)) return issues;
  
  data.forEach((item) => {
    const rem = item?.rem || {};
    const companyName = rem.company_name || 'Empresa Desconhecida';
    const periodo = rem.periodo || 'N/A';
    
    // Check fatalities
    if (Number(rem.fatalidades) > 0) {
      issues.fatalities.push({
        company: companyName,
        periodo,
        count: Number(rem.fatalidades)
      });
    }
    
    // Check high LTIFR
    if (Number(rem.taxa_com_afastamento) > RISK_THRESHOLDS.LTIFR.ACCEPTABLE) {
      issues.highLTIFR.push({
        company: companyName,
        periodo,
        value: Number(rem.taxa_com_afastamento)
      });
    }
    
    // Check high severity
    if (Number(rem.gravidade) > RISK_THRESHOLDS.SEVERITY.CONCERNING) {
      issues.highSeverity.push({
        company: companyName,
        periodo,
        value: Number(rem.gravidade)
      });
    }
  });
  
  return issues;
};

/**
 * Get company performance summary for ranking
 * @param {Array} companyData - All periods for a single company
 * @returns {object} Performance summary
 */
export const getCompanyPerformanceSummary = (companyData) => {
  if (!companyData || companyData.length === 0) {
    return { score: 0, level: 'ACCEPTABLE', hasCriticalIssues: false };
  }
  
  const latestData = companyData[0]?.rem || {};
  
  const ltifr = Number(latestData.taxa_com_afastamento) || 0;
  const trifr = Number(latestData.total_incidentes_registraveis) || 0;
  const severity = Number(latestData.gravidade) || 0;
  const fatalities = Number(latestData.fatalidades) || 0;
  
  // Calculate composite risk score (lower is better)
  let score = 0;
  score += ltifr * 10;  // Weight LTIFR heavily
  score += trifr * 2;
  score += severity * 0.5;
  score += fatalities * 1000;  // Fatalities dominate score
  
  const hasCriticalIssues = 
    fatalities > 0 || 
    ltifr > RISK_THRESHOLDS.LTIFR.CONCERNING ||
    trifr > RISK_THRESHOLDS.TRIFR.CONCERNING;
  
  let level = 'EXCELLENT';
  if (ltifr > RISK_THRESHOLDS.LTIFR.EXCELLENT || trifr > RISK_THRESHOLDS.TRIFR.EXCELLENT) {
    level = 'ACCEPTABLE';
  }
  if (ltifr > RISK_THRESHOLDS.LTIFR.ACCEPTABLE || trifr > RISK_THRESHOLDS.TRIFR.ACCEPTABLE) {
    level = 'CONCERNING';
  }
  if (ltifr > RISK_THRESHOLDS.LTIFR.CONCERNING || fatalities > 0) {
    level = 'CRITICAL';
  }
  
  return { score, level, hasCriticalIssues };
};
