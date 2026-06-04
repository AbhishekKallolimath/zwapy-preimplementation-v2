import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Workshops() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(null);

  useEffect(() => {
    fetchWorkshops();
  }, []);

  async function fetchWorkshops() {
    setLoading(true);
    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .order('date', { ascending: true });
    if (error) console.error('Error fetching workshops:', error);
    else setWorkshops(data);
    setLoading(false);
  }

  async function registerForWorkshop(workshopId) {
    setRegistering(workshopId);
    // For now, use a hardcoded student_id (later replace with logged‑in user's ID)
    // You can get the student_id from your auth context / session
    const studentId = '00000000-0000-0000-0000-000000000001'; // change to real ID

    const { error } = await supabase
      .from('workshop_registrations')
      .insert([
        {
          workshop_id: workshopId,
          student_id: studentId,
          payment_status: 'pending', // or 'completed' if free
        },
      ]);

    if (error) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + error.message);
    } else {
      alert('Successfully registered!');
      // Optionally refresh the page or update UI
    }
    setRegistering(null);
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading workshops...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Creagenix Workshops</h1>
      {workshops.length === 0 && <p>No workshops available yet.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1.5rem' }}>
        {workshops.map((workshop) => (
          <div
            key={workshop.id}
            style={{
              border: '1px solid #00D4FF',
              borderRadius: '1rem',
              padding: '1.5rem',
              width: '300px',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <h3 style={{ color: '#00D4FF', marginBottom: '0.5rem' }}>{workshop.title}</h3>
            <p style={{ color: '#ccc', marginBottom: '0.5rem' }}>{workshop.description}</p>
            <p>
              <strong>Date:</strong> {new Date(workshop.date).toLocaleString()}
            </p>
            <p>
              <strong>Price:</strong> ₹{workshop.price}
            </p>
            <p>
              <strong>Capacity:</strong> {workshop.capacity}
            </p>
            <button
              onClick={() => registerForWorkshop(workshop.id)}
              disabled={registering === workshop.id}
              style={{
                marginTop: '1rem',
                background: '#00D4FF',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {registering === workshop.id ? 'Registering...' : 'Register'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}