import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import ReactFlow, { 
  Controls,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import API_ENDPOINTS from '../../config/apiConfig';

// Dynamic node types with adaptive sizing
const createNodeTypes = (scaleFactor = 1) => {
  // Scale values based on number of nodes
  const width = {
    center: Math.max(240, 300 * scaleFactor),
    side: Math.max(180, 230 * scaleFactor),
    control: Math.max(160, 200 * scaleFactor)
  };
  
  // Minimum heights for nodes
  const minHeight = {
    center: Math.max(50, 60 * scaleFactor),
    side: Math.max(35, 40 * scaleFactor),
    control: Math.max(35, 40 * scaleFactor)
  };
  
  const fontSize = {
    label: Math.max(18, 22 * scaleFactor),
    node: Math.max(11, 13 * scaleFactor),
    center: Math.max(12, 14 * scaleFactor)
  };
  
  const handleSize = Math.max(3, 4 * scaleFactor);
  
  return {
    // Background label nodes
    backgroundLabel: ({ data }) => (
      <div 
        className="font-weight-bold"
        style={{ 
          fontSize: `${fontSize.label}px`,
          position: 'relative',
          zIndex: 5,
          textAlign: 'center',
          width: data.width || 'auto',
          color: data.side === 'left' ? '#1a5089' : '#c26916',
          textShadow: '1px 1px 2px rgba(255,255,255,0.7)',
          marginTop: '5px'
        }}
      >
        {data.label}
      </div>
    ),
    center: ({ data }) => (
      <div 
        className="p-3 rounded shadow-sm text-center"
        style={{ 
          background: '#4f9fec', 
          color: 'white', 
          width: `${width.center}px`,
          minHeight: `${minHeight.center}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${fontSize.center}px`,
          fontWeight: 'bold',
          border: '1px solid #3483d1'
        }}
      >
        {/* Left handle for connections from penyebab */}
        <Handle
          type="target"
          position={Position.Left}
          id="center-left"
          style={{ background: '#3483d1', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
        
        {data.label}
        
        {/* Right handle for connections to dampak */}
        <Handle
          type="source"
          position={Position.Right}
          id="center-right"
          style={{ background: '#ff943e', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
      </div>
    ),
    penyebab: ({ data }) => (
      <div 
        className="p-2 rounded shadow-sm"
        style={{ 
          background: '#e8f3ff', 
          color: '#3483d1', 
          width: `${width.side}px`,
          minHeight: `${minHeight.side}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${fontSize.node}px`,
          border: '1px solid #bacbde'
        }}
      >
        {data.label}
        
        {/* Right handle for connection to pengendalian */}
        <Handle
          type="source"
          position={Position.Right}
          id="penyebab-out"
          style={{ background: '#3483d1', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
      </div>
    ),
    dampak: ({ data }) => (
      <div 
        className="p-2 rounded shadow-sm"
        style={{ 
          background: '#fff2e6', 
          color: '#ff943e', 
          width: `${width.side}px`,
          minHeight: `${minHeight.side}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${fontSize.node}px`,
          border: '1px solid #ffcc9c'
        }}
      >
        {/* Left handle for connection from pengendalian */}
        <Handle
          type="target"
          position={Position.Left}
          id="dampak-in"
          style={{ background: '#ff943e', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
        
        {data.label}
      </div>
    ),
    pengendalianPenyebab: ({ data }) => (
      <div 
        className="p-2 rounded shadow-sm"
        style={{ 
          background: '#3483d1', 
          color: 'white', 
          width: `${width.control}px`,
          minHeight: `${minHeight.control}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${fontSize.node}px`,
          fontWeight: 'medium',
          border: '1px solid #2271be'
        }}
      >
        {/* Left handle for connection from penyebab */}
        <Handle
          type="target"
          position={Position.Left}
          id="control-penyebab-in"
          style={{ background: '#3483d1', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
        
        {data.label}
        
        {/* Right handle for connection to center */}
        <Handle
          type="source"
          position={Position.Right}
          id="control-penyebab-out"
          style={{ background: '#3483d1', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
      </div>
    ),
    pengendalianDampak: ({ data }) => (
      <div 
        className="p-2 rounded shadow-sm"
        style={{ 
          background: '#ff943e', 
          color: 'white', 
          width: `${width.control}px`,
          minHeight: `${minHeight.control}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${fontSize.node}px`,
          fontWeight: 'medium',
          border: '1px solid #e57c26'
        }}
      >
        {/* Left handle for connection from center */}
        <Handle
          type="target"
          position={Position.Left}
          id="control-dampak-in"
          style={{ background: '#ff943e', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
        
        {data.label}
        
        {/* Right handle for connection to dampak */}
        <Handle
          type="source"
          position={Position.Right}
          id="control-dampak-out"
          style={{ background: '#ff943e', width: `${handleSize}px`, height: `${handleSize}px` }}
        />
      </div>
    ),
  };
};

// Default edge options
const defaultEdgeOptions = {
  style: { strokeWidth: 3 },
  type: 'straight'
};

// Background area styling
const BackgroundSection = ({ side, color }) => {
  const style = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    background: color,
    zIndex: 0,
    ...(side === 'left' ? { left: 0 } : { right: 0 }),
    borderRadius: side === 'left' ? '0 0 100% 0' : '0 0 0 100%',
  };
  
  return <div style={style} />;
};

BackgroundSection.propTypes = {
  side: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
};

const BowtieVisualization = forwardRef(({ identifikasiId }, ref) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diagramHeight, setDiagramHeight] = useState(600);
  const [nodeTypes, setNodeTypes] = useState(createNodeTypes(1));
  const [refreshKey, setRefreshKey] = useState(0);
  const bowtieRef = useRef(null);

  // Expose the downloadPDF function and refresh method to parent components
  useImperativeHandle(ref, () => ({
    downloadPDF: handleDownloadPDF,
    refresh: () => {
      setRefreshKey(prev => prev + 1);
      setLoading(true);
    }
  }));

  useEffect(() => {
    const fetchBowtieData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(API_ENDPOINTS.getBowtieVisualisasi(identifikasiId), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data;
        generateDiagram(data);
      } catch (err) {
        console.error('Error fetching bowtie data:', err);
        setError('Gagal memuat data visualisasi Bowtie');
      } finally {
        setLoading(false);
      }
    };
    
    if (identifikasiId) {
      fetchBowtieData();
    }
  }, [identifikasiId, refreshKey]);
  
  const generateDiagram = (data) => {
    // Calculate center position based on expected diagram size
    const centerX = 600;
    // Adjust centerY based on number of nodes to leave more space for labels
    const centerY = Math.max(data.penyebab?.length || 0, data.dampak?.length || 0) > 5 ? 280 : 250;
    
    // Get the maximum number of items on either side
    const maxItemCount = Math.max(
      data.penyebab?.length || 0,
      data.dampak?.length || 0
    );
    
    // Calculate scale factor based on number of items
    // More items = smaller nodes
    let scaleFactor = 1;
    if (maxItemCount > 15) {
      scaleFactor = 0.6; // Even smaller for very large diagrams
    } else if (maxItemCount > 10) {
      scaleFactor = 0.7;
    } else if (maxItemCount > 7) {
      scaleFactor = 0.8;
    } else if (maxItemCount > 5) {
      scaleFactor = 0.9;
    }
    
    // Update node types with new scale factor
    setNodeTypes(createNodeTypes(scaleFactor));
    
    // Create center node
    const centerNode = {
      id: 'center-node',
      type: 'center',
      position: { x: centerX - (150 * scaleFactor), y: centerY - 10 }, // Shifted slightly up for better balance
      data: { 
        label: `${data.nama_sasaran} | ${data.nama_probis} | ${data.nama_pernyataan_risiko}`
      },
      draggable: false, // Lock node position
    };
    
    const newNodes = [centerNode];
    const newEdges = [];
    
    // Adjust horizontal spacing based on scale factor
    const horizontalSpacing = {
      penyebabX: centerX - (680 * scaleFactor),
      controlPenyebabX: centerX - (420 * scaleFactor),
      controlDampakX: centerX + (170 * scaleFactor),
      dampakX: centerX + (420 * scaleFactor)
    };
    
    // Calculate label positions - position them higher up based on number of nodes
    // More nodes = higher position for labels to avoid overlap
    const labelYPosition = maxItemCount > 8 ? 10 : maxItemCount > 5 ? 20 : 40;
    
    // Calculate horizontal positions for labels to align with node columns
    const labelPositions = {
      threats: horizontalSpacing.penyebabX + 50, // Center over penyebab column
      prevention: horizontalSpacing.controlPenyebabX + 50, // Center over control penyebab column
      recovery: horizontalSpacing.controlDampakX + 50, // Center over control dampak column
      consequences: horizontalSpacing.dampakX + 50 // Center over dampak column
    };
    
    // Add background section labels
    newNodes.push({
      id: 'label-threats',
      type: 'backgroundLabel',
      position: { x: labelPositions.threats, y: labelYPosition },
      data: { 
        label: 'Threats', 
        width: '200px',
        side: 'left'
      },
      draggable: false,
      selectable: false,
    });
    
    newNodes.push({
      id: 'label-prevention',
      type: 'backgroundLabel',
      position: { x: labelPositions.prevention, y: labelYPosition },
      data: { 
        label: 'Prevention', 
        width: '200px',
        side: 'left'
      },
      draggable: false,
      selectable: false,
    });
    
    newNodes.push({
      id: 'label-recovery',
      type: 'backgroundLabel',
      position: { x: labelPositions.recovery, y: labelYPosition },
      data: { 
        label: 'Recovery', 
        width: '200px',
        side: 'right'
      },
      draggable: false,
      selectable: false,
    });
    
    newNodes.push({
      id: 'label-consequences',
      type: 'backgroundLabel',
      position: { x: labelPositions.consequences, y: labelYPosition },
      data: { 
        label: 'Consequences', 
        width: '200px',
        side: 'right'
      },
      draggable: false,
      selectable: false,
    });
    
    // Calculate spacing based on number of items
    const calculateNodeSpacing = (items) => {
      // Calculate node height based on scale factor (including padding)
      // Add extra padding to ensure boxes don't touch
      const nodeHeight = Math.max(40, 45 * scaleFactor) + 20; // Base height + padding
      
      // Minimum spacing should be at least nodeHeight + 25px gap between nodes
      const minSpacing = nodeHeight + 25;
      
      // Adjust base spacing based on scale factor
      const baseSpacing = Math.max(minSpacing, 95 * scaleFactor); // Increased base spacing
      const maxItems = Math.max(items.length, 1);
      
      // If there are more than 6 items, we need to increase the diagram height
      if (maxItems > 6) {
        // For very large numbers of items, use more compact spacing but ensure minimum
        const spacingFactor = maxItems > 15 ? 0.9 : 1;
        const spacing = Math.max(minSpacing, baseSpacing * spacingFactor);
        const newHeight = 600 + ((maxItems - 6) * spacing);
        setDiagramHeight(newHeight);
        return spacing;
      }
      
      // For fewer items, use more even spacing like in the reference image
      // But ensure minimum spacing to prevent boxes from touching
      return maxItems <= 1 ? 250 : Math.max(minSpacing, Math.min(480 / maxItems, 110) * scaleFactor);
    };
    
    // Use the same spacing for both sides to maintain symmetry
    const spacing = calculateNodeSpacing(maxItemCount > 0 ? { length: maxItemCount } : []);
    
    // Create penyebab nodes (left side)
    if (data.penyebab && data.penyebab.length > 0) {
      // Calculate total height needed for all nodes
      const totalHeight = (data.penyebab.length - 1) * spacing;
      // Calculate starting Y position to center the nodes vertically
      const startY = centerY - (totalHeight / 2);
      
      data.penyebab.forEach((penyebab, index) => {
        const penyebabId = `penyebab-${index}`;
        const controlId = `control-penyebab-${index}`;
        const yPos = startY + (index * spacing);
        
        // Penyebab node (light blue)
        newNodes.push({
          id: penyebabId,
          type: 'penyebab',
          position: { x: horizontalSpacing.penyebabX, y: yPos },
          data: { label: penyebab.deskripsi },
          draggable: false, // Lock node position
        });
        
        // Control node (blue)
        newNodes.push({
          id: controlId,
          type: 'pengendalianPenyebab',
          position: { x: horizontalSpacing.controlPenyebabX, y: yPos },
          data: { label: penyebab.pengendalian || 'Tidak ada pengendalian' },
          draggable: false, // Lock node position
        });
        
        // Connect penyebab to control
        newEdges.push({
          id: `e-${penyebabId}-${controlId}`,
          source: penyebabId,
          target: controlId,
          sourceHandle: 'penyebab-out',
          targetHandle: 'control-penyebab-in',
          type: 'straight',
          style: { stroke: '#3483d1', strokeWidth: 3 * scaleFactor },
          interactionWidth: 0, // Disable edge interaction
        });
        
        // Connect control to center
        newEdges.push({
          id: `e-${controlId}-center`,
          source: controlId,
          target: 'center-node',
          sourceHandle: 'control-penyebab-out',
          targetHandle: 'center-left',
          type: 'straight',
          style: { stroke: '#3483d1', strokeWidth: 3 * scaleFactor },
          interactionWidth: 0, // Disable edge interaction
        });
      });
    }
    
    // Create dampak nodes (right side)
    if (data.dampak && data.dampak.length > 0) {
      // Calculate total height needed for all nodes
      const totalHeight = (data.dampak.length - 1) * spacing;
      // Calculate starting Y position to center the nodes vertically
      const startY = centerY - (totalHeight / 2);
      
      data.dampak.forEach((dampak, index) => {
        const dampakId = `dampak-${index}`;
        const controlId = `control-dampak-${index}`;
        const yPos = startY + (index * spacing);
        
        // Control node (orange)
        newNodes.push({
          id: controlId,
          type: 'pengendalianDampak',
          position: { x: horizontalSpacing.controlDampakX, y: yPos },
          data: { label: dampak.pengendalian || 'Tidak ada pengendalian' },
          draggable: false, // Lock node position
        });
        
        // Dampak node (light orange)
        newNodes.push({
          id: dampakId,
          type: 'dampak',
          position: { x: horizontalSpacing.dampakX, y: yPos },
          data: { label: dampak.deskripsi },
          draggable: false, // Lock node position
        });
        
        // Connect center to control
        newEdges.push({
          id: `e-center-${controlId}`,
          source: 'center-node',
          target: controlId,
          sourceHandle: 'center-right',
          targetHandle: 'control-dampak-in',
          type: 'straight',
          style: { stroke: '#ff943e', strokeWidth: 3 * scaleFactor },
          interactionWidth: 0, // Disable edge interaction
        });
        
        // Connect control to dampak
        newEdges.push({
          id: `e-${controlId}-${dampakId}`,
          source: controlId,
          target: dampakId,
          sourceHandle: 'control-dampak-out',
          targetHandle: 'dampak-in',
          type: 'straight',
          style: { stroke: '#ff943e', strokeWidth: 3 * scaleFactor },
          interactionWidth: 0, // Disable edge interaction
        });
      });
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleDownloadPDF = async () => {
    if (!bowtieRef.current) return;
    
    try {
      // Get the diagram container
      const element = bowtieRef.current;
      
      // Hide controls before capturing
      const controlsElement = element.querySelector('.react-flow__controls');
      const reactFlowAttribution = element.querySelector('.react-flow__attribution');
      
      // Store original display values
      let controlsDisplay = 'block';
      let attributionDisplay = 'block';
      
      if (controlsElement) {
        controlsDisplay = controlsElement.style.display;
        controlsElement.style.display = 'none';
      }
      
      if (reactFlowAttribution) {
        attributionDisplay = reactFlowAttribution.style.display;
        reactFlowAttribution.style.display = 'none';
      }
      
      // Create canvas from the diagram
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Restore controls display
      if (controlsElement) {
        controlsElement.style.display = controlsDisplay;
      }
      
      // Restore attribution display
      if (reactFlowAttribution) {
        reactFlowAttribution.style.display = attributionDisplay;
      }
      
      // Get image dimensions
      const imgData = canvas.toDataURL('image/png');
      
      // Convert canvas pixels to PDF points (72 dpi)
      const pdfWidth = canvas.width / 2; // scaled down from 2x scale
      const pdfHeight = canvas.height / 2; // scaled down from 2x scale
      
      // Create PDF with custom size that matches the image exactly
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight]
      });
      
      // Add image with exact dimensions (no margins)
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download PDF
      pdf.save('bowtie-diagram.pdf');
      
      return true;
    } catch (err) {
      console.error('Error generating PDF:', err);
      return false;
    }
  };

  if (loading) {
    return <div className="text-center p-4">Memuat visualisasi Bowtie...</div>;
  }
  
  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }
  
  return (
    <div 
      ref={bowtieRef}
      style={{ height: `${diagramHeight}px`, width: '100%', position: 'relative' }}
    >
      {/* Background Sections */}
      <BackgroundSection side="left" color="rgba(52, 131, 209, 0.2)" />
      <BackgroundSection side="right" color="rgba(255, 148, 62, 0.2)" />
      
      {/* Style to hide ReactFlow attribution */}
      <style>
        {`
          .react-flow__attribution {
            display: none !important;
          }
          
          .pdf-hide-controls {
            position: absolute;
            bottom: 10px;
            right: 10px;
            z-index: 5;
          }
          
          /* Remove border/outline around controls */
          .react-flow__controls {
            box-shadow: none !important;
            background: transparent !important;
            border: none !important;
          }
          
          .react-flow__controls button {
            background: rgba(255, 255, 255, 0.8) !important;
            border: 1px solid #eee !important;
            border-radius: 4px !important;
            margin-bottom: 4px !important;
          }
          
          @media print {
            .pdf-hide-controls {
              display: none !important;
            }
          }
        `}
      </style>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: '#555', strokeWidth: 3 }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        preventScrolling={true}
        proOptions={{ hideAttribution: true }}
        key={refreshKey}
      >
        <Controls 
          showInteractive={false}
          className="pdf-hide-controls"
        />
      </ReactFlow>
    </div>
  );
});

BowtieVisualization.propTypes = {
  identifikasiId: PropTypes.string.isRequired,
};

BowtieVisualization.displayName = 'BowtieVisualization';

export default BowtieVisualization; 