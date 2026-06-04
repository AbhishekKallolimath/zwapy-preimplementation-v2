import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function MyWorkshops() {
  const [registeredWorkshops, setRegisteredWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  // For now, hardcode a student ID (replace with logged-in user later)
  const studentId = '00000000-0000-0000-0000-000000000001'; // change to real ID

  useEffect(() => {
    fetchMyWorkshops();
  }, []);

  async function fetchMyWorkshops() {
    setLoading(true);
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select(`
        id,
        payment_status,
        registration_date,
        workshops (
          id,
          title,
          description,
          date,
          meeting_link,
          status
        )
      `)
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching registrations:', error);
    } else {
      setRegisteredWorkshops(data);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading your workshops...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>My Workshops</h1>
      {registeredWorkshops.length === 0 && <p>You haven't registered for any workshops yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        {registeredWorkshops.map((reg) => {
          const workshop = reg.workshops;
          return (
            <div
              key={reg.id}
              style={{
                border: '1px solid #00D4FF',
                borderRadius: '1rem',
                padding: '1rem',
                background: 'rgba(0,0,0,0.4)',
              }}
            >
              <h3 style={{ color: '#00D4FF' }}>{workshop.title}</h3>
              <p>{workshop.description}</p>
              <p><strong>Date:</strong> {new Date(workshop.date).toLocaleString()}</p>
              <p><strong>Payment Status:</strong> {reg.payment_status}</p>
              {workshop.meeting_link && (
                <a
                  href={workshop.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    background: '#00D4FF',
                    color: '#000',
                    padding: '0.5rem 1rem',
                    borderRadius: '2rem',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Join Zoom Meeting
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}