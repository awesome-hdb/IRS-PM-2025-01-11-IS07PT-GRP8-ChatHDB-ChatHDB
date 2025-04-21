import { useState, useCallback, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  Position,
  MarkerType,
  NodeChange,
  applyNodeChanges,
  applyEdgeChanges,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useClickOutside } from '@/app/hooks/useClickOutside';

interface ModelFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelFlowModal({ isOpen, onClose }: ModelFlowModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Use the click outside hook
  useClickOutside(modalRef, onClose, isOpen);
  
  // Define nodes for the flow chart with horizontal layout
  const initialNodes: Node[] = [
    // Input Features
    {
      id: 'input',
      data: { 
        label: (
          <div>
            <div className="font-bold mb-2">Input Features</div>
            <div className="text-sm text-gray-600">
              (floor level, floor area, rental price, street name, remaining lease, transaction date)
            </div>
          </div>
        ) 
      },
      position: { x: 100, y: 120 },
      style: { 
        background: '#f3f4f6', 
        padding: '15px', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        width: 250,
        textAlign: 'center',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    },
    
    // Random Forest Model
    {
      id: 'model',
      data: { label: 'Xgboost Model' },
      position: { x: 450, y: 120 },
      style: { 
        background: '#dbeafe', 
        padding: '15px', 
        borderRadius: '8px', 
        border: '1px solid #bfdbfe',
        width: 200,
        height: 80,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: '16px',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    },

    // Base Resale Price
    {
      id: 'base-price',
      data: { label: 'Base Resale Price' },
      position: { x: 750, y: 120 },
      style: { 
        background: '#d1fae5', 
        padding: '15px', 
        borderRadius: '8px', 
        border: '1px solid #a7f3d0',
        width: 180,
        textAlign: 'center',
        fontWeight: 'bold',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    },

    // Final Adjusted Resale Price
    {
      id: 'final-price',
      data: { label: 'Final Adjusted Resale Price' },
      position: { x: 1050, y: 120 },
      style: { 
        background: '#c7d2fe', 
        padding: '15px', 
        borderRadius: '8px', 
        border: '1px solid #a5b4fc',
        width: 220,
        height: 60,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: '16px',
      },
      targetPosition: Position.Left,
      draggable: true,
    },

    // Google Trends Analytics
    {
      id: 'google-trends',
      data: { label: 'Google Trends Analytics' },
      position: { x: 750, y: 230 },
      style: { 
        background: '#fee2e2', 
        padding: '10px', 
        borderRadius: '8px', 
        border: '1px solid #fecaca',
        width: 180,
        textAlign: 'center',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    },
    
    // Google News Sentiment
    {
      id: 'news-sentiment',
      data: { label: 'Google News Sentiment' },
      position: { x: 750, y: 310 },
      style: { 
        background: '#fee2e2', 
        padding: '10px', 
        borderRadius: '8px', 
        border: '1px solid #fecaca',
        width: 180,
        textAlign: 'center',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    },
    
    // Economic Data
    {
      id: 'economic-data',
      data: { label: 'Economic Data' },
      position: { x: 750, y: 390 },
      style: { 
        background: '#fee2e2', 
        padding: '10px', 
        borderRadius: '8px', 
        border: '1px solid #fecaca',
        width: 180,
        textAlign: 'center',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    }
  ];

  // Define edges for the flow chart with straight lines
  const initialEdges: Edge[] = [
    // Input to Model
    { 
      id: 'input-to-model', 
      source: 'input', 
      target: 'model', 
      animated: true, 
      style: { stroke: '#94a3b8' },
      type: 'straight'
    },
    
    // Model to Base Price
    { 
      id: 'model-to-base', 
      source: 'model', 
      target: 'base-price', 
      animated: true, 
      style: { strokeWidth: 2, stroke: '#10b981' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#10b981',
        width: 15,
        height: 15,
      },
      type: 'straight'
    },
    
    // Base Price to Final Price
    { 
      id: 'base-to-final', 
      source: 'base-price', 
      target: 'final-price', 
      animated: true, 
      style: { strokeWidth: 2, stroke: '#10b981' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#10b981',
        width: 15,
        height: 15,
      },
      type: 'straight'
    },
    
    // Google Trends to Final Price
    { 
      id: 'google-trends-to-final', 
      source: 'google-trends', 
      target: 'final-price', 
      animated: true, 
      style: { stroke: '#ef4444', strokeDasharray: '5,5' },
      label: '+/- 3%',
      labelStyle: { fill: '#ef4444', fontWeight: 'bold' },
      type: 'straight'
    },
    
    // News Sentiment to Final Price
    { 
      id: 'news-sentiment-to-final', 
      source: 'news-sentiment', 
      target: 'final-price', 
      animated: true,
      style: { stroke: '#ef4444', strokeDasharray: '5,5' },
      label: '+/- 2%',
      labelStyle: { fill: '#ef4444', fontWeight: 'bold' },
      type: 'straight'
    },
    
    // Economic Data to Final Price
    { 
      id: 'economic-data-to-final', 
      source: 'economic-data', 
      target: 'final-price', 
      animated: true,
      style: { stroke: '#ef4444', strokeDasharray: '5,5' },
      label: '+/- 1.5%',
      labelStyle: { fill: '#ef4444', fontWeight: 'bold' },
      type: 'straight'
    }
  ];

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // Add handlers for node changes to enable dragging
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Add handlers for edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-gray-900 rounded-xl w-[95vw] max-w-7xl max-h-[90vh] shadow-xl flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">     Model Flow</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-[calc(90vh-100px)] w-full bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-right"
            defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
            defaultEdgeOptions={{ type: 'straight' }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </motion.div>
    </div>
  );
} 