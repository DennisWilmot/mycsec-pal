'use client';
export default function SubjectIcon({subject, color='#2563eb', background='#eef4fe'}){
  const icons={Mathematics:'∑', 'English A':'❞', Chemistry:'⚗', Physics:'⚛', Biology:'♧', 'Principles of Accounts':'▤', 'Principles of Business':'▣'};
  return <div className="subject-icon" style={{color,background}}>{icons[subject]||'✦'}</div>
}
