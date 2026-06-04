import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase.from('students').select('*')
      if (error) console.error('Supabase error:', error)
      else setStudents(data)
      setLoading(false)
    }
    fetchStudents()
  }, [])

  if (loading) return <div>Loading Creagenix Admin...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Creagenix Admin Dashboard</h1>
      <h2>Students ({students.length})</h2>
      <ul>
        {students.map(s => (
          <li key={s.id}>{s.full_name} – {s.email}</li>
        ))}
      </ul>
    </div>
  )
}