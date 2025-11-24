# Lightning Network Graph Visualization

An interactive web-based visualization of the Lightning Network, updated daily, developed by **Bitcoin Data Labs**. Explore Lightning Network nodes and channels through an intuitive interface with advanced filtering, bridge analysis, and real-time statistics.

🔗 **[Live Demo](https://sorukumar.github.io/ln-graph-viz/)**

## Features

- **Interactive Graph Visualization**: Pan, zoom, and click on nodes/edges to explore the network.
- **Multiple Dataset Views**: Filter by channel capacity:
  - Complete Network (all channels)
  - Freeway Network (>1 BTC channels)
  - Highway Network (>5M sats channels)
- **Advanced Filtering**:
  - **Pleb Rank**: Filter nodes by top N rankings.
  - **Node Bridges**: Identify critical bridge nodes and network bottlenecks.
  - **Channel Bridges**: Highlight bridge channels connecting network clusters.
- **Dynamic Force-Directed Layout**: Real-time graph layout with user controls.
- **Search Functionality**: Find nodes by name or alias.
- **Detailed Information Panels**: View node and channel details in the sidebar.
- **Real-time Statistics**: Live node/channel counts and total network capacity.
- **Responsive Design**: Optimized for desktop and mobile devices.

## How to Use

### 1. Select a Dataset

On the main page, choose from the available datasets:

- **Complete Network** (`gall.json`): All channels (≈12,000+ nodes, 40,000+ channels).
- **Freeway Network** (`gfree.json`): High-capacity channels (>1 BTC).
- **Highway Network** (`ghigh.json`): Medium-capacity channels (>5M sats).

### 2. Navigate the Graph

- **Pan**: Click and drag to move around the graph.
- **Zoom**: Use the mouse wheel or zoom controls.
- **Reset**: Click *Reset* to return to the default view.
- **Search**: Type in the search box to find nodes by name/alias.

### 3. Apply Filters

Use the filters panel to focus on specific network structures:

- **Pleb Rank (Top N)**:
  - Select `All` or restrict to top N ranked nodes.

- **Node Bridges**:
  - **Show All Nodes**: Default view.
  - **Critical Bridge Only**: Show only nodes whose removal would disconnect parts of the network.
  - **Any Bridge Only**: Show nodes that act as bridges between clusters.

- **Channel Bridges**:
  - **Show All Channels**: Default view.
  - **Bridge Channels Only**: Show channels that connect different parts of the graph.

Click **Apply Filters** to update the view, or **Clear** to reset filters.

### 4. Explore Node and Channel Details

- **Hover** over nodes/edges to see quick tooltips.
- **Click a node** to view detailed node information (capacity, degree, connections, etc.) in the *Node Information* panel.
- **Click a channel (edge)** to view detailed channel information in the *Channel Information* panel.

### 5. Understand the Visualization

- **Node Colors**: Represent different network clusters/communities.
- **Node Size**: Proportional to the number of channels (larger = more connected).
- **Edge Width**: Proportional to channel capacity (thicker = higher capacity).
- **Statistics Panel**: Top panel shows real-time metrics such as:
  - Total nodes
  - Total channels
  - Aggregate capacity

## Tech Stack

- **Backend / Data Processing**: Python (for statistics and network analysis).
- **Frontend**: JavaScript.
- **Graph Rendering**: [Sigma.js](https://www.sigmajs.org/).
- **Data Format**: JSON graph data, updated regularly.

## Development

For detailed technical information, including data formats, architecture, and how to extend or contribute, see:

- [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md)

## Citation

If you find this visualization helpful in your research or work, please cite:

```bibtex
@misc{ln-graph-viz,
  author = {Saurabh Kumar and Bitcoin Data Labs},
  title = {Lightning Network Graph Visualization},
  year = {2025},
  publisher = {GitHub},
  url = {https://github.com/sorukumar/ln-graph-viz}
}

## License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.
