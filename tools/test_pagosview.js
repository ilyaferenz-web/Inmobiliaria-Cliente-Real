const esbuild = require('esbuild');
const chunk = `import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Eye, Search, ChevronRight, Building2, AlertCircle, CheckCircle, Edit2, RotateCcw, Wrench, Image, DollarSign } from 'lucide-react'

// Dedicated payments view component
function PagosView() {
  return null
}`;

try{
  const result = esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: 'test.jsx' });
  console.log('Transform succeeded');
  console.log('Output:', result.code.slice(0, 200));
} catch(e){
  console.error('Transform failed:', e.message);
}
