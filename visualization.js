// =============================================================================
// ATTRIBUTE MAPPING - Converts shortened names to original names for UX
// =============================================================================

/**
 * Mapping from shortened attribute names (used in JSON) to original attribute names (used in UX)
 * Based on test.md documentation
 */
const ATTRIBUTE_MAPPING = {
    // Node attributes
    node: {
        'alias': 'alias',           // unchanged
        'c': 'cluster',
        'br': 'is_bridge_node',
        'ibr': 'is_important_bridge_node',
        'bc': 'bridges_clusters',
        'cc': 'cluster_connections',
        'pk': 'pub_key',
        'nt': 'node_type',
        'tch': 'total_channels',
        'tcap': 'total_capacity',
        'fcap': 'formatted_total_capacity',
        'cat': 'category_counts',
        'pr': 'pleb_rank',
        'cr': 'capacity_rank',
        'chr': 'channels_rank',
        'btx': 'birth_tx',
        'clc': 'closed_channels_count'
    },
    // Edge attributes
    edge: {
        'br': 'is_bridge_channel',
        'ibr': 'is_important_bridge_channel',
        'cc': 'connects_clusters',
        'cap': 'total_capacity',
        'cnt': 'channel_count',
        'chs': 'channels'
    },
    // Channel object attributes (inside channels array)
    channel: {
        't': 'tier',
        'cap': 'capacity',
        'btx': 'birth_tx'
    }
};

/**
 * Maps a node from the new shortened format to the original format expected by the visualization code
 * @param {Object} node - Node object with shortened attribute names
 * @returns {Object} Node object with original attribute names
 */
function mapNodeAttributes(node) {
    const mapped = { id: node.id };
    
    // Copy position if exists
    if (node.x !== undefined) mapped.x = node.x;
    if (node.y !== undefined) mapped.y = node.y;
    
    // Map all attributes
    for (const [shortName, longName] of Object.entries(ATTRIBUTE_MAPPING.node)) {
        if (node[shortName] !== undefined) {
            mapped[longName] = node[shortName];
        }
    }
    
    return mapped;
}

/**
 * Maps an edge from the new shortened format to the original format expected by the visualization code
 * @param {Object} edge - Edge object with shortened attribute names
 * @returns {Object} Edge object with original attribute names
 */
function mapEdgeAttributes(edge) {
    const mapped = {
        id: edge.id,
        source: edge.source,
        target: edge.target
    };
    
    // Copy type if exists
    if (edge.type !== undefined) mapped.type = edge.type;
    
    // Map all attributes
    for (const [shortName, longName] of Object.entries(ATTRIBUTE_MAPPING.edge)) {
        if (edge[shortName] !== undefined) {
            // Special handling for channels array
            if (shortName === 'chs' && Array.isArray(edge[shortName])) {
                mapped[longName] = edge[shortName].map(mapChannelAttributes);
            } else {
                mapped[longName] = edge[shortName];
            }
        }
    }
    
    // For backward compatibility, if edge has 'cap' (total_capacity), also set it as 'capacity'
    if (mapped.total_capacity !== undefined) {
        mapped.capacity = mapped.total_capacity;
    }
    
    return mapped;
}

/**
 * Maps a channel object from the new shortened format to the original format
 * @param {Object} channel - Channel object with shortened attribute names
 * @returns {Object} Channel object with original attribute names
 */
function mapChannelAttributes(channel) {
    const mapped = {};
    
    for (const [shortName, longName] of Object.entries(ATTRIBUTE_MAPPING.channel)) {
        if (channel[shortName] !== undefined) {
            mapped[longName] = channel[shortName];
        }
    }
    
    return mapped;
}

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

// Animation and timing settings for UI interactions
const TIMING = {
    ZOOM_ANIMATION: 200,        // Duration for zoom in/out animations (ms)
    LAYOUT_AUTO_STOP: 5000,     // Auto-stop layout after 5 seconds
    TOOLTIP_OFFSET: 5,          // Pixel offset from cursor for tooltips
    SEARCH_MIN_LENGTH: 2        // Minimum characters to trigger search
};

// Bitcoin capacity conversion thresholds (satoshis to BTC/mBTC/μBTC)
const CAPACITY_THRESHOLDS = {
    BTC: 100000000,    // 1 BTC = 100M satoshis
    MBTC: 100000,      // 1 mBTC = 100K satoshis  
    UBTC: 1000         // 1 μBTC = 1K satoshis
};

// Cluster color palette for network communities
const CLUSTER_COLORS = {
    0: '#60A5FA',   // Warm blue (blue-400) - Distinct and vibrant
    1: '#4ADE80',   // Warm green (green-400) - High contrast with blue
    2: '#C084FC',   // Warm purple (purple-400) - Distinct from blue/green
    3: '#FACC15',   // Warm amber (amber-400) - Warm yellow tone
    4: '#2DD4BF',   // Warm teal (teal-400) - Green-blue blend
    5: '#F87171',   // Warm red (red-400) - Red for variety
    6: '#FB923C',   // Warm orange (orange-400) - Orange complement
    7: '#EAB308',   // Warm yellow (yellow-500) - Bright yellow
    8: '#A3E635',   // Warm lime (lime-400) - Light green
    9: '#34D399',   // Warm emerald (emerald-400) - Deeper green
    10: '#22D3EE',  // Warm cyan (cyan-400) - Blue-green
    11: '#38BDF8',  // Warm sky (sky-400) - Light blue
    12: '#818CF8',  // Warm indigo (indigo-400) - Blue-purple
    13: '#A78BFA',  // Warm violet (violet-400) - Purple-blue
    14: '#F472B6',  // Warm pink (pink-400) - Pink accent
    DEFAULT: '#9CA3AF'  // Soft gray (gray-400)
};

// Bridge node highlighting
const BRIDGE_NODE_CONFIG = {
    IMPORTANT_BRIDGE: {
        borderColor: '#EF4444',
        borderWidth: 3
    },
    REGULAR_BRIDGE: {
        borderColor: '#FB923C',
        borderWidth: 2
    }
};

// Edge coloring - using pre-calculated colors from data
const EDGE_HIGHLIGHT = {
    IMPORTANT_BRIDGE: '#B0B0B0',  // Darker gray for critical bridges
    REGULAR_BRIDGE: '#C8C8C8',    // Medium gray for regular bridges
    DEFAULT: '#D8D8D8'            // Light gray for normal edges
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

// Global state for tracking selected node (used for gray-out effect on edges)
let selectedNode = null;

// Global reference to current renderer instance for proper cleanup
let currentRenderer = null;
let currentLayoutManager = null;
let currentGraph = null; // Track current graph for summary updates

// Store event listeners for proper cleanup
let controlButtonListeners = {
    zoomIn: null,
    zoomOut: null,
    resetView: null,
    toggleLayout: null
};

// Store the current search handler to remove it when needed
let currentSearchHandler = null;

// Track if a dataset is currently being loaded to prevent concurrent loads
let isLoadingDataset = false;

// Global filter state
let filterState = {
    plebRankMax: null,  // null = show all
    minCapacity: 0,     // Minimum capacity in BTC
    minChannels: 0,     // Minimum number of channels
    isActive: false  // Track if any filters are active
};

// Store total node count for filter results display
let totalNodeCount = 0;

// =============================================================================
// NETWORK SUMMARY FUNCTION
// =============================================================================

/**
 * Updates the network summary box with current visible node and edge counts
 * This shows the filtered/visible counts, not the total dataset
 */
function updateNetworkSummary() {
    if (!currentGraph) {
        console.warn('Graph not initialized yet');
        return;
    }
    
    let visibleNodes = 0;
    let visibleEdges = 0;
    
    // Count visible nodes
    currentGraph.forEachNode(nodeId => {
        const isHidden = currentGraph.getNodeAttribute(nodeId, 'hidden');
        if (!isHidden) {
            visibleNodes++;
        }
    });
    
    // Count visible edges
    currentGraph.forEachEdge(edgeId => {
        const isHidden = currentGraph.getEdgeAttribute(edgeId, 'hidden');
        if (!isHidden) {
            visibleEdges++;
        }
    });
    
    // Update the summary display
    const nodesElement = document.getElementById('summary-nodes-count');
    const channelsElement = document.getElementById('summary-channels-count');
    
    if (nodesElement) {
        nodesElement.textContent = visibleNodes.toLocaleString();
    }
    
    if (channelsElement) {
        channelsElement.textContent = visibleEdges.toLocaleString();
    }
    
    console.log(`📊 Network Summary: ${visibleNodes} nodes, ${visibleEdges} channels visible`);
}

// Make updateNetworkSummary available globally
window.updateNetworkSummary = updateNetworkSummary;

// =============================================================================
// URL STATE SYNC
// =============================================================================

/**
 * Updates the browser URL to reflect the current state (selected node, search, filters)
 * Allows for deep linking to specific graph views
 */
function syncURLState() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let hasChanges = false;
        
        // Handle node selection
        if (selectedNode) {
            if (urlParams.get('node') !== selectedNode) {
                urlParams.set('node', selectedNode);
                hasChanges = true;
            }
        } else if (urlParams.has('node')) {
            urlParams.delete('node');
            hasChanges = true;
        }
        
        // Handle search
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value.trim().length >= TIMING.SEARCH_MIN_LENGTH) {
            if (urlParams.get('search') !== searchInput.value.trim()) {
                urlParams.set('search', searchInput.value.trim());
                hasChanges = true;
            }
        } else if (urlParams.has('search')) {
            urlParams.delete('search');
            hasChanges = true;
        }
        
        // Handle filters
        if (filterState.plebRankMax) {
            if (urlParams.get('plebRankMax') !== filterState.plebRankMax.toString()) {
                urlParams.set('plebRankMax', filterState.plebRankMax);
                hasChanges = true;
            }
        } else if (urlParams.has('plebRankMax')) {
            urlParams.delete('plebRankMax');
            hasChanges = true;
        }
        
        if (filterState.minCapacity > 0) {
            if (urlParams.get('minCapacity') !== filterState.minCapacity.toString()) {
                urlParams.set('minCapacity', filterState.minCapacity);
                hasChanges = true;
            }
        } else if (urlParams.has('minCapacity')) {
            urlParams.delete('minCapacity');
            hasChanges = true;
        }

        if (filterState.minChannels > 0) {
            if (urlParams.get('minChannels') !== filterState.minChannels.toString()) {
                urlParams.set('minChannels', filterState.minChannels);
                hasChanges = true;
            }
        } else if (urlParams.has('minChannels')) {
            urlParams.delete('minChannels');
            hasChanges = true;
        }
        

        
        // Update URL if changes occurred
        if (hasChanges) {
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            // Don't append empty '?' if no params
            window.history.replaceState({}, '', urlParams.toString() ? newUrl : window.location.pathname);
        }
    } catch (error) {
        console.warn('Error syncing URL state:', error);
    }
}

/**
 * Reads URL parameters and applies the corresponding state to the visualization
 * Should be called after the graph is fully loaded and renderer initialized
 */
function applyUrlParams(graph, renderer, sidebarManager) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let shouldFilter = false;
        
        // Apply filters first so they affect the graph before selecting/searching
        if (urlParams.has('plebRankMax')) {
            const val = parseInt(urlParams.get('plebRankMax'), 10);
            if (!isNaN(val)) {
                filterState.plebRankMax = val;
                
                const radio = document.querySelector(`input[name="pleb-rank-filter"][value="${val}"]`);
                if (radio) radio.checked = true;
                
                shouldFilter = true;
            }
        }
        
        if (urlParams.has('minCapacity')) {
            const val = parseFloat(urlParams.get('minCapacity'));
            if (!isNaN(val)) {
                filterState.minCapacity = val;
                
                const radio = document.querySelector(`input[name="min-capacity-filter"][value="${val}"]`);
                if (radio) radio.checked = true;
                
                shouldFilter = true;
            }
        }

        if (urlParams.has('minChannels')) {
            const val = parseInt(urlParams.get('minChannels'), 10);
            if (!isNaN(val)) {
                filterState.minChannels = val;
                
                const radio = document.querySelector(`input[name="min-channels-filter"][value="${val}"]`);
                if (radio) radio.checked = true;
                
                shouldFilter = true;
            }
        }
        

        
        // Execute filter logic if any filters were found
        if (shouldFilter && typeof applyFilters === 'function') {
            filterState.isActive = true;
            applyFilters(graph, renderer);
        }
        
        // Apply search
        if (urlParams.has('search')) {
            const searchVal = urlParams.get('search');
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = searchVal;
                // Dispatch input event to trigger search handler
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        
        // Apply node selection
        if (urlParams.has('node')) {
            const nodeId = urlParams.get('node');
            if (graph.hasNode(nodeId)) {
                selectedNode = nodeId;
                
                // Update sidebar
                const nodeAttributes = graph.getNodeAttributes(nodeId);
                sidebarManager.updateNodeInfo({ node: nodeId, attributes: nodeAttributes });
                
                // Refresh renderer to apply visual reducers (graying out non-connected)
                renderer.refresh();
                
                // Animate camera to center on the selected node
                const nodePosition = renderer.getNodeDisplayData(nodeId);
                if (nodePosition) {
                    renderer.getCamera().animate(
                        { x: nodePosition.x, y: nodePosition.y, ratio: 0.3 }, 
                        { duration: TIMING.ZOOM_ANIMATION }
                    );
                }
            }
        }
    } catch (error) {
        console.warn('Error applying URL parameters:', error);
    }
}

// =============================================================================
// CLEANUP FUNCTION
// =============================================================================

/**
 * Destroys the current visualization and cleans up all resources
 * Call this before loading a new dataset to prevent memory leaks and conflicts
 */
async function destroyVisualization() {
    console.log('🧹 Destroying current visualization...');
    
    // Stop any running layout
    if (currentLayoutManager && currentLayoutManager.isRunning) {
        const toggleBtn = document.getElementById('toggle-layout');
        if (toggleBtn) {
            currentLayoutManager.stop(toggleBtn);
        }
    }
    
    // Clear layout manager reference
    currentLayoutManager = null;
    
    // Destroy the Sigma renderer
    if (currentRenderer) {
        try {
            currentRenderer.kill();
            console.log('✅ Renderer destroyed');
        } catch (e) {
            console.warn('⚠️ Error killing renderer:', e);
        }
        currentRenderer = null;
    }
    
    // Remove the canvas element if it exists
    const graphContainer = document.getElementById('graph-container');
    const canvases = graphContainer.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        canvas.remove();
        console.log('✅ Canvas removed');
    });
    
    // Reset global state
    selectedNode = null;
    currentGraph = null; // Clear graph reference
    
    // Reset summary display
    const nodesCountEl = document.getElementById('summary-nodes-count');
    const channelsCountEl = document.getElementById('summary-channels-count');
    if (nodesCountEl) nodesCountEl.textContent = '0';
    if (channelsCountEl) nodesCountEl.textContent = '0';
    
    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Reset sidebar
    const nodeInfo = document.getElementById('node-info');
    const edgeInfo = document.getElementById('edge-info');
    if (nodeInfo) {
        nodeInfo.innerHTML = `
            <div class="info-title">Node Information</div>
            <div class="info-content">Select a node to see details</div>
        `;
    }
    if (edgeInfo) {
        edgeInfo.innerHTML = `
            <div class="info-title">Channel Information</div>
            <div class="info-content">Select a channel to see details</div>
        `;
    }
    
    // Wait a moment for everything to clean up
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Cleanup complete');
}

// =============================================================================
// DATA PROCESSING UTILITIES
// =============================================================================

/**
 * Calculates comprehensive statistics including percentiles for capacity and channels
 * Works with the new enhanced data format (snake_case fields)
 * @param {Array} nodes - Array of Lightning Network nodes
 * @param {Array} edges - Array of Lightning Network channels
 * @returns {Object} Enhanced statistics object with min/max values, percentiles, and total capacity
 */
function calculateDataStats(nodes, edges) {
    /**
     * Helper function to calculate percentiles from a sorted array
     * @param {Array} sortedArray - Pre-sorted array of numbers
     * @returns {Object} Statistics object with min, max, percentiles, and average
     */
    function calculatePercentiles(sortedArray) {
        const len = sortedArray.length;
        if (len === 0) return { min: 0, q25: 0, median: 0, q75: 0, max: 0, avg: 0 };
        
        const min = sortedArray[0];
        const max = sortedArray[len - 1];
        
        // Calculate percentile indices
        const q25Index = Math.max(0, Math.floor((len - 1) * 0.25));
        const medianIndex = Math.max(0, Math.floor((len - 1) * 0.50));
        const q75Index = Math.max(0, Math.floor((len - 1) * 0.75));
        
        const q25 = sortedArray[q25Index];
        const median = sortedArray[medianIndex];
        const q75 = sortedArray[q75Index];
        
        // Calculate average
        const sum = sortedArray.reduce((total, val) => total + val, 0);
        const avg = sum / len;
        
        return { min, q25, median, q75, max, avg };
    }
    
    // 1. Channel size distribution (from edges)
    const channelSizes = edges
        .map(edge => edge.capacity || 0)
        .filter(capacity => capacity > 0)
        .sort((a, b) => a - b);
    
    const channelSizeStats = calculatePercentiles(channelSizes);
    
    // 2. Node channel count distribution
    const nodeChannels = nodes
        .map(node => node.total_channels || 0)
        .filter(channels => channels > 0)
        .sort((a, b) => a - b);
    
    const channelStats = calculatePercentiles(nodeChannels);
    
    // 3. Node capacity distribution
    const nodeCapacities = nodes
        .map(node => node.total_capacity || 0)
        .filter(capacity => capacity > 0)
        .sort((a, b) => a - b);
    
    const nodeCapacityStats = calculatePercentiles(nodeCapacities);
    
    // 4. Node betweenness distribution
    const nodeBetweenness = nodes
        .map(node => node.node_betweenness || 0)
        .filter(betweenness => betweenness > 0)
        .sort((a, b) => a - b);
    
    const betweennessStats = calculatePercentiles(nodeBetweenness);
    
    // Calculate total capacity from node totals 
    const totalCapacity = nodeCapacities.reduce((sum, capacity) => sum + capacity, 0) / 2;
    
    // Return enhanced statistics object
    return {
        nodes: { 
            min: channelStats.min || 1, 
            max: channelStats.max || 1 
        },
        edges: { 
            min: channelSizeStats.min || 1, 
            max: channelSizeStats.max || 1 
        },
        totalCapacity: totalCapacity,
        channelSize: {
            min: channelSizeStats.min,
            q25: channelSizeStats.q25,
            median: channelSizeStats.median,
            q75: channelSizeStats.q75,
            max: channelSizeStats.max,
            avg: channelSizeStats.avg,
            count: channelSizes.length
        },
        channels: {
            min: channelStats.min,
            q25: channelStats.q25,
            median: channelStats.median,
            q75: channelStats.q75,
            max: channelStats.max,
            avg: channelStats.avg,
            count: nodeChannels.length
        },
        nodeCapacity: {
            min: nodeCapacityStats.min,
            q25: nodeCapacityStats.q25,
            median: nodeCapacityStats.median,
            q75: nodeCapacityStats.q75,
            max: nodeCapacityStats.max,
            avg: nodeCapacityStats.avg,
            count: nodeCapacities.length
        },
        betweenness: {
            min: betweennessStats.min,
            q25: betweennessStats.q25,
            median: betweennessStats.median,
            q75: betweennessStats.q75,
            max: betweennessStats.max,
            avg: betweennessStats.avg,
            count: nodeBetweenness.length
        }
    };
}

/**
 * Creates reusable calculators for consistent node/edge sizing across the graph
 * Node size based on channel count (more intuitive for Lightning Network)
 * Edge width based on channel capacity
 * Uses logarithmic scaling to handle wide range of values
 * Optimized for large graphs (40k+ edges) following Sigma.js demo best practices
 * @param {Object} dataStats - Pre-calculated statistics from calculateDataStats
 * @returns {Object} Calculator functions for nodeSize and edgeWidth
 */
function createSizeCalculators(dataStats) {
    const { nodes: nodeStats, edges: edgeStats } = dataStats;
    
    // Sigma.js demo sizing for large graphs with 40k+ edges
    const NODE_SIZE_RANGE = { min: 2, max: 20 };      // Nodes: 2-10px (smaller for dense graphs)
    const EDGE_WIDTH_RANGE = { min: 0.1, max: 2 };    // Edges: 0.5-2px (thin for visual clarity)
    
    return {
        nodeSize: (totalChannels) => {
            // Use channel count for sizing - more intuitive for Lightning Network
            if (!totalChannels || !nodeStats.max) return NODE_SIZE_RANGE.min;
            const normalizedValue = (Math.log(Math.max(totalChannels, 1)) - Math.log(Math.max(nodeStats.min, 1))) /
                                  (Math.log(nodeStats.max) - Math.log(Math.max(nodeStats.min, 1)));
            return NODE_SIZE_RANGE.min + normalizedValue * (NODE_SIZE_RANGE.max - NODE_SIZE_RANGE.min);
        },
        
        edgeWidth: (capacity) => {
            // Use capacity-based sizing for channels
            if (!capacity || !edgeStats.max) return EDGE_WIDTH_RANGE.min;
            const normalizedValue = (Math.log(Math.max(capacity, 1)) - Math.log(Math.max(edgeStats.min, 1))) /
                                  (Math.log(edgeStats.max) - Math.log(Math.max(edgeStats.min, 1)));
            return EDGE_WIDTH_RANGE.min + normalizedValue * (EDGE_WIDTH_RANGE.max - EDGE_WIDTH_RANGE.min);
        }
    };
}

/**
 * Converts satoshi amounts to Lightning Network standard display format
 * Uses BTC for larger amounts (≥ 0.01 BTC) with sats conversion, and short form sats for smaller amounts
 * @param {number} capacity - Capacity in satoshis
 * @returns {string} Formatted capacity string with unit
 */
function formatCapacity(capacity) {
    if (!capacity) return '0 sats';
    
    // Lightning Network threshold: 0.01 BTC = 1,000,000 satoshis
    const LIGHTNING_BTC_THRESHOLD = 1000000;
    
    if (capacity >= LIGHTNING_BTC_THRESHOLD) {
        const btcValue = capacity / CAPACITY_THRESHOLDS.BTC;
        
        // Format sats in short form
        let satsShort;
        if (capacity >= 1000000000) {
            satsShort = `${(capacity / 1000000000).toFixed(1)}B sats`;
        } else if (capacity >= 1000000) {
            satsShort = `${(capacity / 1000000).toFixed(1)}M sats`;
        } else {
            satsShort = `${(capacity / 1000).toFixed(0)}K sats`;
        }
        
        // For amounts ≥ 1 BTC, show 2 decimal places
        if (capacity >= CAPACITY_THRESHOLDS.BTC) {
            return `${btcValue.toFixed(2)} BTC (${satsShort})`;
        }
        // For amounts 0.01 - 1 BTC, show 3 decimal places
        else {
            return `${btcValue.toFixed(3)} BTC (${satsShort})`;
        }
    } else {
        // For small amounts, show in short form satoshis only
        if (capacity >= 1000) {
            return `${(capacity / 1000).toFixed(0)}K sats`;
        } else {
            return `${capacity} sats`;
        }
    }
}

// =============================================================================
// EDGE COLORING SYSTEM
// =============================================================================

/**
 * Gets edge color based on enhanced data attributes
 * Uses pre-calculated colors from data when available
 * @param {Object} edge - Edge data object
 * @returns {string} Color hex code
 */
function getEdgeColor(edge) {
    // Highlight important bridge channels
    if (edge.is_important_bridge_channel) {
        return EDGE_HIGHLIGHT.IMPORTANT_BRIDGE;
    }
    
    // Highlight regular bridge channels
    if (edge.is_bridge_channel) {
        return EDGE_HIGHLIGHT.REGULAR_BRIDGE;
    }
    
    // Default color
    return EDGE_HIGHLIGHT.DEFAULT;
}

/**
 * Gets node color based on cluster or pre-calculated color
 * @param {Object} node - Node data object
 * @returns {string} Color hex code
 */
function getNodeColor(node) {
    // Use cluster-based coloring
    if (node.cluster !== undefined && node.cluster !== null) {
        return CLUSTER_COLORS[node.cluster] || CLUSTER_COLORS.DEFAULT;
    }
    
    // Default color
    return CLUSTER_COLORS.DEFAULT;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Entry point: Loads JSON data from server and initializes the visualization
 * Handles network errors and displays error messages to user
 * @param {string} jsonFile - Path to JSON file containing graph data
 * @returns {Promise} Resolves when visualization is complete
 */
async function initVisualization(jsonFile) {
    // Destroy any existing visualization before creating a new one
    await destroyVisualization();

    // Load the JSON data
    return fetch(jsonFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${jsonFile}: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Initialize the visualization with the loaded data
            createVisualization(data, jsonFile);
            console.log('📈 Visualization created');
        })
        .catch(error => {
            console.error('Error loading JSON data:', error);
            const graphContainer = document.getElementById('graph-container');
            if (graphContainer) {
                graphContainer.innerHTML = 
                    `<div style="padding: 20px; color: red;">Error loading data: ${error.message}</div>`;
            }
            throw error;
        });
}

// =============================================================================
// TOOLTIP AND SIDEBAR MANAGEMENT
// =============================================================================

/**
 * Manages tooltip display and positioning for node/edge hover effects
 * Shows enhanced network analysis metrics
 * @param {HTMLElement} tooltipElement - DOM element for tooltip display
 * @returns {Object} API for tooltip operations
 */
function createTooltipManager(tooltipElement) {
    let currentHover = null;
    
    function show(content, event) {
        currentHover = true;
        tooltipElement.innerHTML = content;
        tooltipElement.style.display = 'block';
        position(event);
    }
    
    function hide() {
        currentHover = null;
        tooltipElement.style.display = 'none';
    }
    
    function position(event) {
        const x = event.x + TIMING.TOOLTIP_OFFSET;
        const y = event.y + TIMING.TOOLTIP_OFFSET;
        tooltipElement.style.left = x + 'px';
        tooltipElement.style.top = y + 'px';
    }
    
    function createNodeTooltip(nodeAttributes) {
        const attrs = nodeAttributes.attributes;
        let bridgeInfo = '';
        
        if (attrs.isImportantBridgeNode) {
            bridgeInfo = '<div style="color: #EF4444; font-weight: bold;">🌉 Critical Bridge Node</div>';
        } else if (attrs.isBridgeNode) {
            bridgeInfo = '<div style="color: #FB923C; font-weight: bold;">🌉 Bridge Node</div>';
        }
                
        return `
            <div><strong>${nodeAttributes.label}</strong></div>
            ${bridgeInfo}

            <div>Capacity: ${attrs.totalCapacity}</div>
            <div>Channels: ${attrs.totalChannels}</div>
            <div>Pleb Rank: ${attrs.plebRank}</div>
            <div>Type: ${attrs.nodeType || 'Unknown'}</div>

        `;
    }
    
    function createEdgeTooltip(edgeAttributes, graph, edgeId) {
        const attrs = edgeAttributes.attributes;
        const sourceNode = graph.getNodeAttributes(graph.source(edgeId));
        const targetNode = graph.getNodeAttributes(graph.target(edgeId));
        
        let bridgeInfo = '';
        if (attrs.isImportantBridgeChannel) {
            bridgeInfo = '<div style="color: #B0B0B0; font-weight: bold;">🌉 Critical Bridge Channel</div>';
        } else if (attrs.isBridgeChannel) {
            bridgeInfo = '<div style="color: #C8C8C8; font-weight: bold;">🌉 Bridge Channel</div>';
        }
        
        // Multi-channel information (show when channel_count > 1)
        let channelInfo = '';
        const channelCount = attrs.channelCount;
        const channels = attrs.channels;
        
        if (channelCount && channelCount > 1 && channels && Array.isArray(channels)) {
            // Multiple channels
            let individualChannels = '';
            channels.forEach((channel, index) => {
                const birthTx = channel.birth_tx || 'N/A';
                individualChannels += `
                    <div style="margin-bottom: 4px;">
                        <div><strong>Channel ${index + 1}</strong></div>
                        <div style="margin-left: 8px;">Capacity: ${formatCapacity(channel.capacity)}</div>
                        <div style="margin-left: 8px;">Birth Tx: ${birthTx}</div>
                    </div>
                `;
            });
            
            channelInfo = `
                <div style="margin-top: 5px; padding: 5px; background: rgba(96, 165, 250, 0.1); border-left: 2px solid #60A5FA;">
                    <div style="font-weight: bold; color: #60A5FA;">Multi-Channel (${channelCount})</div>
                    ${individualChannels}
                </div>
            `;
        } else {
            // Single channel - get birth_tx from first channel in array or from edge ID
            let birthTx = 'N/A';
            if (channels && Array.isArray(channels) && channels.length > 0) {
                birthTx = channels[0].birth_tx || 'N/A';
            }
            channelInfo = `<div>Birth Tx: ${birthTx}</div>`;
        }
        
        return `
            <div><strong>Channel</strong></div>
            ${bridgeInfo}
            <div>From: ${sourceNode.label}</div>
            <div>To: ${targetNode.label}</div>
            <div>Capacity: ${formatCapacity(attrs.capacity)}</div>
            ${channelInfo}
        `;
    }
    
    return { show, hide, position, createNodeTooltip, createEdgeTooltip, get currentHover() { return currentHover; } };
}

/**
 * Manages sidebar information panel updates when nodes/edges are clicked
 * Shows enhanced network analysis metrics
 * @returns {Object} API for sidebar operations
 */
function createSidebarManager() {
    function getCategoryDefinition(category) {
        const definitions = {
            'Freeway': ' (> 1 BTC channel)',
            'Highway': ' (> 5M sats channel)',
            'My Way': ' (other)'
        };
        return definitions[category] || '';
    }

    function updateNodeInfo(nodeAttributes) {
        const attrs = nodeAttributes.attributes;
        
        let categoryCountsHtml = '';
        try {
            const categoryCountsObj = typeof attrs.categoryCount === 'string' 
                ? JSON.parse(attrs.categoryCount) 
                : attrs.categoryCount;
                
            if (categoryCountsObj && typeof categoryCountsObj === 'object') {
                for (const [category, count] of Object.entries(categoryCountsObj)) {
                    const definition = getCategoryDefinition(category);
                    categoryCountsHtml += `<div><span class="info-label">${category}${definition}:</span> ${count}</div>`;
                }
            } else {
                categoryCountsHtml = `<div>${attrs.categoryCount || 'N/A'}</div>`;
            }
        } catch (e) {
            categoryCountsHtml = `<div>${attrs.categoryCount || 'N/A'}</div>`;
        }
        
        // Bridge node information
        let bridgeInfo = '';
        if (attrs.isImportantBridgeNode) {
            bridgeInfo = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444;">
                    <div style="font-weight: bold; color: #EF4444;">🌉 Critical Bridge Node</div>
                    <div><span class="info-label">Bridges Clusters:</span> ${attrs.bridgesClusters || 'N/A'}</div>
                    <div><span class="info-label">Cluster Connections:</span> ${attrs.clusterConnections || 'N/A'}</div>
                </div>
            `;
        } else if (attrs.isBridgeNode) {
            bridgeInfo = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(251, 146, 60, 0.1); border-left: 3px solid #FB923C;">
                    <div style="font-weight: bold; color: #FB923C;">🌉 Bridge Node</div>
                    <div><span class="info-label">Bridges Clusters:</span> ${attrs.bridgesClusters || 'N/A'}</div>
                    <div><span class="info-label">Cluster Connections:</span> ${attrs.clusterConnections || 'N/A'}</div>
                </div>
            `;
        }
        
        // Cluster information
        let clusterInfo = '';
        if (attrs.cluster !== undefined && attrs.cluster !== null) {
            clusterInfo = `<div><span class="info-label">Cluster:</span> ${attrs.cluster}</div>`;
        }
        
        // Closed channels
        let closedChannelsInfo = '';
        if (attrs.closedChannelsCount !== undefined && attrs.closedChannelsCount !== null) {
            closedChannelsInfo = `<div><span class="info-label">Closed Channels:</span> ${attrs.closedChannelsCount}</div>`;
        }

        document.getElementById('node-info').innerHTML = `
            <div class="info-title">${nodeAttributes.label}</div>
            <div class="info-content">
                ${clusterInfo}
                <div><span class="info-label">Type:</span> ${attrs.nodeType || 'Unknown'}</div>
                <div><span class="info-label">Total Capacity:</span> ${attrs.totalCapacity}</div>
                <div><span class="info-label">Total Channels:</span> ${attrs.totalChannels}</div>
                ${closedChannelsInfo}
                <div><span class="info-label">Pleb Rank:</span> ${attrs.plebRank}</div>
                <div><span class="info-label">Capacity Rank:</span> ${attrs.capacityRank}</div>
                <div><span class="info-label">Channels Rank:</span> ${attrs.channelsRank}</div>
                <div><span class="info-label">Public Key:</span> ${attrs.pubKey}</div>
                <div><span class="info-label">Birth Transaction:</span> ${attrs.birthTx || 'N/A'}</div>
                ${bridgeInfo}
                <div style="margin-top: 10px;"><span class="info-label">Channel Categories:</span></div>
                ${categoryCountsHtml}
            </div>
        `;
    }
    
    function updateEdgeInfo(edgeAttributes, graph, edgeId) {
        const attrs = edgeAttributes.attributes;
        const sourceNode = graph.getNodeAttributes(graph.source(edgeId));
        const targetNode = graph.getNodeAttributes(graph.target(edgeId));
        
        // Bridge channel information
        let bridgeInfo = '';
        if (attrs.isImportantBridgeChannel) {
            bridgeInfo = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(176, 176, 176, 0.1); border-left: 3px solid #B0B0B0;">
                    <div style="font-weight: bold; color: #B0B0B0;">🌉 Critical Bridge Channel</div>
                    <div><span class="info-label">Connects Clusters:</span> ${attrs.connectsClusters || 'N/A'}</div>
                </div>
            `;
        } else if (attrs.isBridgeChannel) {
            bridgeInfo = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(200, 200, 200, 0.1); border-left: 3px solid #C8C8C8;">
                    <div style="font-weight: bold; color: #C8C8C8;">🌉 Bridge Channel</div>
                    <div><span class="info-label">Connects Clusters:</span> ${attrs.connectsClusters || 'N/A'}</div>
                </div>
            `;
        }
        
        // Channel information
        let channelDetailsInfo = '';
        const channelCount = attrs.channelCount;
        const channels = attrs.channels;
        
        if (channelCount && channelCount > 1 && channels && Array.isArray(channels)) {
            // Multi-channel
            let individualChannelsHtml = '';
            channels.forEach((channel, index) => {
                const birthTx = channel.birth_tx || 'N/A';
                individualChannelsHtml += `
                    <div style="margin-bottom: 8px;">
                        <div style="font-weight: bold;">Channel ${index + 1}</div>
                        <div><span class="info-label">Capacity:</span> ${formatCapacity(channel.capacity)}</div>
                        <div><span class="info-label">Birth Tx:</span> ${birthTx}</div>
                    </div>
                `;
            });
            
            channelDetailsInfo = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(96, 165, 250, 0.1); border-left: 3px solid #60A5FA;">
                    <div style="font-weight: bold; color: #60A5FA;">Multi-Channel Connection (${channelCount} channels)</div>
                    ${individualChannelsHtml}
                </div>
            `;
        } else {
            // Single channel - get birth_tx from first channel in array
            let birthTx = 'N/A';
            if (channels && Array.isArray(channels) && channels.length > 0) {
                birthTx = channels[0].birth_tx || 'N/A';
            }
            channelDetailsInfo = `<div><span class="info-label">Birth Transaction:</span> ${birthTx}</div>`;
        }

        document.getElementById('edge-info').innerHTML = `
            <div class="info-title">Channel Details</div>
            <div class="info-content">
                <div><span class="info-label">From:</span> ${sourceNode.label}</div>
                <div><span class="info-label">To:</span> ${targetNode.label}</div>
                <div><span class="info-label">Capacity:</span> ${formatCapacity(attrs.capacity)}</div>
                ${channelDetailsInfo}
                ${bridgeInfo}
            </div>
        `;
    }
    
    function reset() {
        document.getElementById('node-info').innerHTML = `
            <div class="info-title">Node Information</div>
            <div class="info-content">Select a node to see details</div>
        `;
        document.getElementById('edge-info').innerHTML = `
            <div class="info-title">Channel Information</div>
            <div class="info-content">Select a channel to see details</div>
        `;
    }
    
    return { updateNodeInfo, updateEdgeInfo, reset };
}

/**
 * Sets up all mouse and click event handlers for the graph visualization
 * Implements Sigma.js demo-style node selection with edge highlighting
 * @param {Object} renderer - Sigma.js renderer instance
 * @param {Object} graph - Graphology graph instance
 * @param {Object} tooltipManager - Tooltip management API
 * @param {Object} sidebarManager - Sidebar management API
 */
function setupEventHandlers(renderer, graph, tooltipManager, sidebarManager) {
    // State reducer for graph display based on selection
    // This follows the Sigma.js demo pattern for node selection highlighting
    renderer.setSetting('nodeReducer', (node, data) => {
        const res = { ...data };
        
        if (selectedNode) {
            // If a node is selected, dim all nodes except selected and its neighbors
            if (node === selectedNode || graph.hasEdge(node, selectedNode) || graph.hasEdge(selectedNode, node)) {
                // Selected node and neighbors remain normal
                res.highlighted = true;
            } else {
                // Other nodes are dimmed
                res.color = '#F3F4F6';
                res.highlighted = false;
            }
        }
        
        return res;
    });
    
    renderer.setSetting('edgeReducer', (edge, data) => {
        const res = { ...data };
        
        if (selectedNode) {
            // Only show edges connected to the selected node
            const source = graph.source(edge);
            const target = graph.target(edge);
            
            if (source === selectedNode || target === selectedNode) {
                // Connected edges are highlighted with the selected node's cluster color
                res.hidden = false;
                const selectedNodeAttrs = graph.getNodeAttributes(selectedNode);
                const cluster = selectedNodeAttrs.attributes.cluster;
                res.color = CLUSTER_COLORS[cluster] || CLUSTER_COLORS.DEFAULT;
                res.size = Math.max(res.size || 1, 2);  // Make connected edges slightly thicker
            } else {
                // Other edges are hidden
                res.hidden = true;
            }
        }
        
        return res;
    });
    
    // Tooltip handlers
    renderer.on('enterNode', event => {
        const nodeAttributes = graph.getNodeAttributes(event.node);
        const content = tooltipManager.createNodeTooltip(nodeAttributes);
        tooltipManager.show(content, event);
    });

    renderer.on('leaveNode', () => {
        tooltipManager.hide();
    });

    renderer.on('enterEdge', event => {
        const edgeAttributes = graph.getEdgeAttributes(event.edge);
        const content = tooltipManager.createEdgeTooltip(edgeAttributes, graph, event.edge);
        tooltipManager.show(content, event);
    });

    renderer.on('leaveEdge', () => {
        tooltipManager.hide();
    });

    // Mouse move for tooltip positioning
    renderer.getMouseCaptor().on('mousemove', event => {
        if (tooltipManager.currentHover) {
            tooltipManager.position(event);
        }
    });

    // Click handlers - Sigma.js demo style
    renderer.on('clickNode', event => {
        const nodeAttributes = graph.getNodeAttributes(event.node);
        sidebarManager.updateNodeInfo(nodeAttributes);
        
        // Toggle node selection - clicking same node deselects it
        if (selectedNode === event.node) {
            selectedNode = null;
        } else {
            selectedNode = event.node;
        }
        
        // Refresh renderer to apply the reducers
        renderer.refresh();
        syncURLState();
    });
    
    // Click on stage (background) to deselect
    renderer.on('clickStage', () => {
        if (selectedNode) {
            selectedNode = null;
            sidebarManager.reset();
            renderer.refresh();
            syncURLState();
        }
    });

    renderer.on('clickEdge', event => {
        const edgeAttributes = graph.getEdgeAttributes(event.edge);
        sidebarManager.updateEdgeInfo(edgeAttributes, graph, event.edge);
    });
}

// =============================================================================
// LAYOUT MANAGEMENT
// =============================================================================

/**
 * Manages ForceAtlas2 layout algorithm execution and graph positioning
 * @param {Object} graph - Graphology graph instance
 * @param {Object} renderer - Sigma.js renderer instance  
 * @param {Array} nodes - Original node data for position tracking
 * @param {Map} originalPositions - Map storing initial node positions for reset
 * @returns {Object} Layout control API
 */
function createLayoutManager(graph, renderer, nodes, originalPositions) {
    let isRunning = false;
    let intervalId = null;
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function centerNodes() {
        const positions = [];
        nodes.forEach(node => {
            if (graph.hasNode(node.id)) {
                const currentX = graph.getNodeAttribute(node.id, 'x');
                const currentY = graph.getNodeAttribute(node.id, 'y');
                positions.push({ x: currentX, y: currentY });
            }
        });
        
        if (positions.length === 0) return;
        
        let avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
        let avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
        
        const shiftX = 500 - avgX;
        const shiftY = 500 - avgY;
        
        nodes.forEach(node => {
            if (graph.hasNode(node.id)) {
                const currentX = graph.getNodeAttribute(node.id, 'x');
                const currentY = graph.getNodeAttribute(node.id, 'y');
                
                const newX = currentX + shiftX;
                const newY = currentY + shiftY;
                
                graph.setNodeAttribute(node.id, 'x', newX);
                graph.setNodeAttribute(node.id, 'y', newY);
                
                originalPositions.set(node.id, { x: newX, y: newY });
            }
        });
    }
    
    function autoFit() {
        const camera = renderer.getCamera();
        camera.animatedReset({ duration: 500 });
    }
    
    async function finalizeLayout() {
        await delay(300);
        centerNodes();
        renderer.refresh();
        await delay(200);
        autoFit();
    }
    
    async function initializePositions() {
        await delay(100);
        centerNodes();
        renderer.refresh();
    }
    
    function start(forceAtlas2, settings) {
        if (isRunning) return;
        
        isRunning = true;
        
        try {
            const runIteration = () => {
                if (!isRunning) return;
                
                try {
                    forceAtlas2.assign(graph, settings);
                    renderer.refresh();
                } catch (error) {
                    stop();
                }
            };
            
            intervalId = setInterval(runIteration, 100);
            
            // Auto-stop and finalize
            setTimeout(async () => {
                if (isRunning) {
                    stop();
                    await finalizeLayout();
                }
            }, 8000);
            
        } catch (error) {
            stop();
        }
    }
    
    function stop() {
        isRunning = false;
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
    
    function reset() {
        if (isRunning) {
            stop();
        }
        
        // Restore original positions
        originalPositions.forEach((position, nodeId) => {
            if (graph.hasNode(nodeId)) {
                graph.setNodeAttribute(nodeId, 'x', position.x);
                graph.setNodeAttribute(nodeId, 'y', position.y);
            }
        });
    }
    
    return {
        start,
        stop,
        reset,
        initializePositions,
        get isRunning() { return isRunning; }
    };
}

// =============================================================================
// MAIN VISUALIZATION CREATION
// =============================================================================

/**
 * Creates the complete interactive graph visualization from loaded data
 * Works with the new enhanced data format (snake_case fields, clusters, betweenness, etc.)
 * @param {Object} data - Parsed JSON data containing nodes and edges arrays
 * @param {string} jsonFile - Path to JSON file containing graph data
 */
function createVisualization(data, jsonFile) {
    // Initialize the graph
    const graph = new graphology.Graph();
    
    // Extract nodes and edges from the data and map them to original format
    const rawNodes = data.nodes || [];
    const rawEdges = data.edges || [];
    
    // Map nodes and edges from shortened format to original format
    const nodes = rawNodes.map(mapNodeAttributes);
    const edges = rawEdges.map(mapEdgeAttributes);
    
    // Store original positions for proper reset functionality
    const originalPositions = new Map();
    
    // Calculate all statistics once
    const dataStats = calculateDataStats(nodes, edges);
    const sizeCalculators = createSizeCalculators(dataStats);

    // Build graph: Add nodes with calculated sizes and colors
    nodes.forEach(node => {
        // Extract node data (all in snake_case format)
        const totalChannels = node.total_channels || 0;
        const totalCapacity = node.total_capacity || 0;
        const formattedCapacity = node.formatted_total_capacity || formatCapacity(totalCapacity);
        const nodeType = node.node_type || 'Unknown';
        const channelSegment = node.channel_segment || 'Unknown';
        const categoryCount = node.category_counts || {};
        const plebRank = node.pleb_rank || 'N/A';
        const capacityRank = node.capacity_rank || 'N/A';
        const channelsRank = node.channels_rank || 'N/A';
        const pubKey = node.pub_key || node.id || '';
        
        // New enhanced data fields
        const cluster = node.cluster;
        const isBridgeNode = node.is_bridge_node || false;
        const isImportantBridgeNode = node.is_important_bridge_node || false;
        const bridgesClusters = node.bridges_clusters;
        const clusterConnections = node.cluster_connections;
        const nodeBetweenness = node.node_betweenness;
        const closedChannelsCount = node.closed_channels_count;
        
        // Use provided coordinates or generate random ones
        const x = node.x !== undefined ? node.x : Math.random() * 1000;
        const y = node.y !== undefined ? node.y : Math.random() * 1000;
        
        // Set node color (do not use color from data, only use cluster-based coloring)
        const nodeColor = node.cluster !== undefined && node.cluster !== null
            ? CLUSTER_COLORS[node.cluster] || CLUSTER_COLORS.DEFAULT
            : CLUSTER_COLORS.DEFAULT;
        
        // Calculate node size using only channel count (no betweenness)
        const nodeSize = sizeCalculators.nodeSize(totalChannels);
        
        graph.addNode(node.id, {
            x: x,
            y: y,
            size: nodeSize,
            label: node.alias || node.id,
            color: nodeColor,
            // Border for bridge nodes
            borderColor: isImportantBridgeNode ? BRIDGE_NODE_CONFIG.IMPORTANT_BRIDGE.borderColor :
                        isBridgeNode ? BRIDGE_NODE_CONFIG.REGULAR_BRIDGE.borderColor : undefined,
            borderSize: isImportantBridgeNode ? BRIDGE_NODE_CONFIG.IMPORTANT_BRIDGE.borderWidth :
                       isBridgeNode ? BRIDGE_NODE_CONFIG.REGULAR_BRIDGE.borderWidth : 0,
            // Store all attributes for display
            attributes: {
                alias: node.alias,
                nodeType: nodeType,
                totalCapacity: formattedCapacity,
                rawCapacity: totalCapacity,
                totalChannels: totalChannels,
                channelSegment: channelSegment,
                categoryCount: categoryCount,
                plebRank: plebRank,
                capacityRank: capacityRank,
                channelsRank: channelsRank,
                pubKey: pubKey,
                cluster: cluster,
                isBridgeNode: isBridgeNode,
                isImportantBridgeNode: isImportantBridgeNode,
                bridgesClusters: bridgesClusters,
                clusterConnections: clusterConnections,
                nodeBetweenness: nodeBetweenness,
                closedChannelsCount: closedChannelsCount,
                birthTx: node.birth_tx
            }
        });
        
        // Store original position for reset functionality
        originalPositions.set(node.id, { x: x, y: y });
    });

    // Build graph: Add edges with dynamic coloring
    edges.forEach(edge => {
        try {
            // Extract edge data (all in snake_case format)
            const channelSizeTier = edge.channel_size_tier || 'Unknown';
            const channelSizeRange = edge.channel_size_range || 'Unknown';
            
            // New enhanced data fields
            const isBridgeChannel = edge.is_bridge_channel || false;
            const isImportantBridgeChannel = edge.is_important_bridge_channel || false;
            const connectsClusters = edge.connects_clusters;
            const edgeBetweenness = edge.edge_betweenness;
            
            // Multi-channel data
            const channelCount = edge.channel_count || 1;
            const channels = edge.channels || [];
            
            // Get edge color (do not use color from data, only use bridge/highlight logic)
            const color = edge.is_important_bridge_channel ? EDGE_HIGHLIGHT.IMPORTANT_BRIDGE :
                          edge.is_bridge_channel ? EDGE_HIGHLIGHT.REGULAR_BRIDGE :
                          EDGE_HIGHLIGHT.DEFAULT;
            
            // Calculate edge width using only capacity (no betweenness)
            const edgeWidth = sizeCalculators.edgeWidth(edge.capacity);
            
            graph.addEdge(edge.source, edge.target, {
                size: edgeWidth,
                color: color,
                type: edge.type || 'line',
                // Store all attributes for display
                attributes: {
                    id: edge.id,
                    channelSizeTier: channelSizeTier,
                    channelSizeRange: channelSizeRange,
                    capacity: edge.capacity,
                    isBridgeChannel: isBridgeChannel,
                    isImportantBridgeChannel: isImportantBridgeChannel,
                    connectsClusters: connectsClusters,
                    edgeBetweenness: edgeBetweenness,
                    channelCount: channelCount,
                    channels: channels
                }
            });
        } catch (e) {
            console.error("Error adding edge:", e, edge);
        }
    });

    // Initialize Sigma.js renderer
    const container = document.getElementById('graph-container');
    const renderer = new Sigma(graph, container, {
        renderEdgeLabels: false,
        labelSize: 12,
        labelColor: { color: '#000' },
        nodeHoverColor: 'default',
        edgeHoverColor: 'default', 
        defaultEdgeHoverColor: '#000',
        defaultNodeHoverColor: '#000',
        labelDensity: 0.07,
        labelGridCellSize: 60,
        labelRenderedSizeThreshold: 6,
        enableEdgeEvents: true,
        enableEdgeHoverEvents: 'debounce',
        enableEdgeClickEvents: true,
        defaultEdgeType: "line",
        minEdgeSize: 0.2,
        maxEdgeSize: 2
    });

    // Track the current renderer globally for cleanup
    currentRenderer = renderer;
    currentGraph = graph; // Store graph reference for summary updates

    // Initialize layout management system
    const layoutManager = createLayoutManager(graph, renderer, nodes, originalPositions);
    currentLayoutManager = layoutManager;

    // Apply initial node centering when visualization loads
    layoutManager.initializePositions();

    // Initialize UI management systems
    const tooltip = document.getElementById('tooltip');
    const tooltipManager = createTooltipManager(tooltip);
    const sidebarManager = createSidebarManager();
    
    // Set up all event handlers for user interactions
    setupEventHandlers(renderer, graph, tooltipManager, sidebarManager);

    // Update network summary with initial counts
    updateNetworkSummary();

    // Search functionality: filters graph based on multiple node fields matching
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', event => {
            const query = event.target.value.toLowerCase();

            if (query.length < TIMING.SEARCH_MIN_LENGTH) {
                // Reset all nodes visibility
                graph.forEachNode(node => {
                    graph.setNodeAttribute(node, 'hidden', false);
                });
                graph.forEachEdge(edge => {
                    graph.setEdgeAttribute(edge, 'hidden', false);
                });
                renderer.refresh();
                return;
            }

            // Hide all nodes and edges first
            graph.forEachNode(node => {
                graph.setNodeAttribute(node, 'hidden', true);
            });
            graph.forEachEdge(edge => {
                graph.setEdgeAttribute(edge, 'hidden', true);
            });

            // Enhanced search with multiple criteria
            const searchTerms = query.split(' ').filter(term => term.length > 0);
            const matchingNodes = new Set();
            const originalMatchingNodes = new Set();

            graph.forEachNode(node => {
                const nodeAttributes = graph.getNodeAttributes(node);
                const attrs = nodeAttributes.attributes;
                
                // Multi-field search
                const basicSearchableText = [
                    nodeAttributes.label || '',
                    attrs.alias || '',
                    attrs.nodeType || '',
                    attrs.channelSegment || '',
                    attrs.pubKey || ''
                ].join(' ').toLowerCase();
                
                // Add channel categories from category counts (only if count > 0)
                let channelTypesText = '';
                try {
                    const categoryCountsObj = typeof attrs.categoryCount === 'string' 
                        ? JSON.parse(attrs.categoryCount) 
                        : attrs.categoryCount;
                        
                    if (categoryCountsObj && typeof categoryCountsObj === 'object') {
                        const activeChannelTypes = Object.keys(categoryCountsObj)
                            .filter(channelType => categoryCountsObj[channelType] > 0)
                            .map(channelType => channelType.toLowerCase());
                        channelTypesText = activeChannelTypes.join(' ');
                    }
                } catch (e) {
                    channelTypesText = '';
                }
                
                // Add cluster if available
                let clusterText = '';
                if (attrs.cluster !== undefined && attrs.cluster !== null) {
                    clusterText = `cluster ${attrs.cluster}`;
                }
                
                // Combine all searchable text
                const searchableText = basicSearchableText + ' ' + channelTypesText + ' ' + clusterText;
                
                // Check if ALL search terms are found (AND logic)
                const isMatch = searchTerms.every(term => searchableText.includes(term));
                
                if (isMatch) {
                    graph.setNodeAttribute(node, 'hidden', false);
                    matchingNodes.add(node);
                    originalMatchingNodes.add(node);

                    // Show connected nodes and edges
                    graph.forEachNeighbor(node, neighbor => {
                        graph.setNodeAttribute(neighbor, 'hidden', false);
                        matchingNodes.add(neighbor);
                    });
                }
            });

            // Show edges ONLY if at least one end is an original matching node
            graph.forEachEdge(edge => {
                const source = graph.source(edge);
                const target = graph.target(edge);
                
                if ((originalMatchingNodes.has(source) || originalMatchingNodes.has(target)) &&
                    matchingNodes.has(source) && matchingNodes.has(target)) {
                    graph.setEdgeAttribute(edge, 'hidden', false);
                }
            });

            renderer.refresh();
            
            // Update network summary after search
            updateNetworkSummary();
            syncURLState();
        });
    }

    // Setup control buttons only once
    if (!controlButtonListeners.zoomIn) {
        // Zoom controls
        const zoomInBtn = document.getElementById('zoom-in');
        if (zoomInBtn) {
            controlButtonListeners.zoomIn = () => {
                if (currentRenderer) {
                    const camera = currentRenderer.getCamera();
                    camera.animatedZoom({ duration: TIMING.ZOOM_ANIMATION });
                }
            };
            zoomInBtn.addEventListener('click', controlButtonListeners.zoomIn);
        }

        const zoomOutBtn = document.getElementById('zoom-out');
        if (zoomOutBtn) {
            controlButtonListeners.zoomOut = () => {
                if (currentRenderer) {
                    const camera = currentRenderer.getCamera();
                    camera.animatedUnzoom({ duration: TIMING.ZOOM_ANIMATION });
                }
            };
            zoomOutBtn.addEventListener('click', controlButtonListeners.zoomOut);
        }

        // Reset view functionality
        const resetViewBtn = document.getElementById('reset-view');
        if (resetViewBtn) {
            controlButtonListeners.resetView = () => {
                if (!currentRenderer || !currentLayoutManager) return;
                
                const camera = currentRenderer.getCamera();
                
                // Use layout manager for reset
                currentLayoutManager.reset();
                
                // Reset any node/edge filtering
                selectedNode = null;
                const graph = currentRenderer.getGraph();
                graph.forEachNode(node => {
                    graph.setNodeAttribute(node, 'hidden', false);
                });
                graph.forEachEdge(edge => {
                    graph.setEdgeAttribute(edge, 'hidden', false);
                });
                
                // Clear search input
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = '';
                }
                
                // Reset sidebar information
                document.getElementById('node-info').innerHTML = `
                    <div class="info-title">Node Information</div>
                    <div class="info-content">Select a node to see details</div>
                `;
                document.getElementById('edge-info').innerHTML = `
                    <div class="info-title">Channel Information</div>
                    <div class="info-content">Select a channel to see details</div>
                `;
                
                camera.animatedReset({ duration: TIMING.ZOOM_ANIMATION });
                currentRenderer.refresh();
                
                // Update network summary after reset
                updateNetworkSummary();
            };
            resetViewBtn.addEventListener('click', controlButtonListeners.resetView);
        }
    }

    // ForceAtlas2 layout integration
    const forceAtlas2 = window.graphologyLibrary?.layoutForceAtlas2 || 
                       window.graphology?.layoutForceAtlas2 ||
                       (typeof graphologyLayoutForceAtlas2 !== 'undefined' ? graphologyLayoutForceAtlas2 : null);

    // =============================================================================
    // FILTER SYSTEM
    // =============================================================================
    
    // Store total node count for filter display
    totalNodeCount = graph.order;
    
    // Initialize filter UI
    updateFilterUI();
    
    /**
     * Check if a node passes all active filters
     */
    function nodePassesFilters(nodeId) {
        if (!filterState.isActive) return true;
        
        const attrs = graph.getNodeAttributes(nodeId).attributes;
        
        // Pleb Rank filter
        if (filterState.plebRankMax !== null) {
            const plebRank = attrs.plebRank;
            if (plebRank === 'N/A' || plebRank === null) return false;
            const rankNum = typeof plebRank === 'string' ? parseInt(plebRank) : plebRank;
            if (isNaN(rankNum) || rankNum > filterState.plebRankMax) return false;
        }

        // Min Capacity filter (slider is in BTC, data is in satoshis)
        if (filterState.minCapacity > 0) {
            const minCapacitySats = filterState.minCapacity * 100000000;
            if ((attrs.rawCapacity || 0) < minCapacitySats) return false;
        }

        // Min Channels filter
        if (filterState.minChannels > 0) {
            if ((attrs.totalChannels || 0) < filterState.minChannels) return false;
        }
        

        
        return true;
    }
    
    /**
     * Apply filters to the graph
     */
    function applyFilters() {
        let visibleCount = 0;
        
        // Apply filters to nodes
        graph.forEachNode(nodeId => {
            const passes = nodePassesFilters(nodeId);
            graph.setNodeAttribute(nodeId, 'hidden', !passes);
            if (passes) visibleCount++;
        });
        
        // Hide edges where both nodes are hidden
        graph.forEachEdge(edgeId => {
            const source = graph.source(edgeId);
            const target = graph.target(edgeId);
            const sourceHidden = graph.getNodeAttribute(source, 'hidden');
            const targetHidden = graph.getNodeAttribute(target, 'hidden');
            graph.setEdgeAttribute(edgeId, 'hidden', sourceHidden || targetHidden);
        });
        
        // Update visible count
        document.getElementById('visible-count').textContent = visibleCount;
        document.getElementById('total-count').textContent = totalNodeCount;
        
        renderer.refresh();
        
        // Update network summary after filters
        updateNetworkSummary();
        syncURLState();
    }
    
    function updateFilterUI() {
        document.getElementById('visible-count').textContent = totalNodeCount;
        document.getElementById('total-count').textContent = totalNodeCount;
        
        // Dynamically render segmented options based on the loaded dataset
        const capContainer = document.getElementById('dynamic-capacity-filters');
        const chanContainer = document.getElementById('dynamic-channels-filters');
        
        if (capContainer && chanContainer) {
            let capOptions = [];
            let chanOptions = [];
            
            if (jsonFile && jsonFile.includes('gfree')) {
                // Freeways -> 1 BTC
                capOptions = [
                    { id: 'cap-all', val: 0, label: 'All', checked: true },
                    { id: 'cap-2', val: 2, label: '2+' },
                    { id: 'cap-5', val: 5, label: '5+' },
                    { id: 'cap-10', val: 10, label: '10+' }
                ];
                chanOptions = [
                    { id: 'chan-all', val: 0, label: 'All', checked: true },
                    { id: 'chan-25', val: 25, label: '25+' },
                    { id: 'chan-100', val: 100, label: '100+' },
                    { id: 'chan-250', val: 250, label: '250+' }
                ];
            } else if (jsonFile && jsonFile.includes('ghigh')) {
                // Highways -> >5M sats
                capOptions = [
                    { id: 'cap-all', val: 0, label: 'All', checked: true },
                    { id: 'cap-01', val: 0.1, label: '0.1+' },
                    { id: 'cap-1', val: 1, label: '1+' },
                    { id: 'cap-5', val: 5, label: '5+' }
                ];
                chanOptions = [
                    { id: 'chan-all', val: 0, label: 'All', checked: true },
                    { id: 'chan-10', val: 10, label: '10+' },
                    { id: 'chan-25', val: 25, label: '25+' },
                    { id: 'chan-100', val: 100, label: '100+' }
                ];
            } else {
                // Complete/gall -> all nodes
                capOptions = [
                    { id: 'cap-all', val: 0, label: 'All', checked: true },
                    { id: 'cap-001', val: 0.01, label: '0.01+' },
                    { id: 'cap-01', val: 0.1, label: '0.1+' },
                    { id: 'cap-1', val: 1, label: '1+' }
                ];
                chanOptions = [
                    { id: 'chan-all', val: 0, label: 'All', checked: true },
                    { id: 'chan-5', val: 5, label: '5+' },
                    { id: 'chan-10', val: 10, label: '10+' },
                    { id: 'chan-50', val: 50, label: '50+' }
                ];
            }
            
            // Inject Capacity Options
            capContainer.innerHTML = capOptions.map(opt => `
                <input type="radio" id="${opt.id}" name="min-capacity-filter" value="${opt.val}" ${opt.checked ? 'checked' : ''}>
                <label for="${opt.id}">${opt.label}</label>
            `).join('');
            
            // Inject Channels Options
            chanContainer.innerHTML = chanOptions.map(opt => `
                <input type="radio" id="${opt.id}" name="min-channels-filter" value="${opt.val}" ${opt.checked ? 'checked' : ''}>
                <label for="${opt.id}">${opt.label}</label>
            `).join('');
        }
    }
    
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedApplyFilters = debounce(() => {
        // Update filter state from UI
        const plebRadio = document.querySelector('input[name="pleb-rank-filter"]:checked');
        if (plebRadio) {
            const plebVal = parseInt(plebRadio.value, 10);
            filterState.plebRankMax = plebVal >= 10000 ? null : plebVal;
        }
        
        const capRadio = document.querySelector('input[name="min-capacity-filter"]:checked');
        if (capRadio) filterState.minCapacity = parseFloat(capRadio.value);
        
        const chanRadio = document.querySelector('input[name="min-channels-filter"]:checked');
        if (chanRadio) filterState.minChannels = parseInt(chanRadio.value, 10);
        
        // Check if any filters are active
        filterState.isActive = 
            filterState.plebRankMax !== null ||
            filterState.minCapacity > 0 ||
            filterState.minChannels > 0;
        
        applyFilters();
    }, 50);

    // Setup Listeners
    // Radios (handles all segmented controls: nodes, channels, capacity, min-channels, pleb-rank)
    
    // Radios (handles all segmented controls: nodes, channels, capacity, min-channels)
    
    // Radios
    const filterRadios = document.querySelectorAll('input[type="radio"]');
    filterRadios.forEach(radio => {
        radio.addEventListener('change', debouncedApplyFilters);
    });
    
    // Clear Filters button
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            // Reset filter state
            filterState.plebRankMax = null;
            filterState.minCapacity = 0;
            filterState.minChannels = 0;
            filterState.isActive = false;
            
            // Reset UI
            const plebAllRadio = document.getElementById('pleb-all');
            if (plebAllRadio) plebAllRadio.checked = true;
            
            const capAllRadio = document.getElementById('cap-all');
            if (capAllRadio) capAllRadio.checked = true;
            
            const chanAllRadio = document.getElementById('chan-all');
            if (chanAllRadio) chanAllRadio.checked = true;
            
            // (Node and channel bridge filter radios have been removed)
            
            // Show all nodes and edges
            graph.forEachNode(nodeId => {
                graph.setNodeAttribute(nodeId, 'hidden', false);
            });
            graph.forEachEdge(edgeId => {
                graph.setEdgeAttribute(edgeId, 'hidden', false);
            });
            
            updateFilterUI();
            renderer.refresh();
            
            // Update network summary after clearing filters
            updateNetworkSummary();
            syncURLState();
            
            console.log('✅ Filters cleared');
        });
    }
    
    // Apply URL params immediately after setting up UI
    applyUrlParams(graph, renderer, sidebarManager);
}