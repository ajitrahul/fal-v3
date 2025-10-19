import Link from 'next/link';
import { DB } from '@/lib/data';
export default function Page(){return (<div><h1 className='text-2xl font-semibold mb-4'>Job Roles</h1><ul className='grid md:grid-cols-2 lg:grid-cols-3 gap-3'>{DB.roles.map(c=> <li key={c.slug} className='card'><Link className='font-medium hover:underline' href={`/roles/${c.slug}`}>{c.name}</Link><p className='text-sm text-gray-600 mt-1'>{c.description}</p></li>)}</ul></div>);}
