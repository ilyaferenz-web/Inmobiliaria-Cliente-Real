import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Eye, Search, ChevronRight, Building2, AlertCircle, CheckCircle, Edit2, RotateCcw, Wrench, Image, DollarSign } from 'lucide-react' 

export default function GestionEdificios() {
  const [edificios, setEdificios] = useState([])
  const [view, setView] = useState('home')
  
  return (
    <div>
      <h1>BuildHub - Gestión de Edificios</h1>
      <p>Minimal stub for testing</p>
    </div>
  )
}
