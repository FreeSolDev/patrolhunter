import React from 'react';
import SimplePathfinderDemo from '../components/SimplePathfinderDemo';
import { Link } from 'react-router-dom';

const DemoPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">GamePathfinder Demo</h1>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Home
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">About GamePathfinder</h2>
          <p className="text-gray-700">
            GamePathfinder is a standalone library for implementing sophisticated AI behavior
            and pathfinding in 2D grid-based games. It features a comprehensive A* pathfinding
            algorithm with path smoothing, entity controllers with five distinct AI behavior
            types, and debug visualization tools.
          </p>
        </div>
        
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Key Features:</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>A* pathfinding algorithm with configurable options</li>
            <li>Entity behavior states with transitions based on player interaction</li>
            <li>Guard, Hunter, Survivor, Preserver, and Merchant AI types</li>
            <li>Support for collaborative entity behavior (group-based actions)</li>
            <li>Path smoothing for more natural movement</li>
            <li>Comprehensive performance optimization with path caching</li>
            <li>Real-time visualization tools for debugging paths</li>
          </ul>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold mb-4">Interactive Demo:</h3>
          <SimplePathfinderDemo />
        </div>
      </div>
    </div>
  );
};

export default DemoPage;