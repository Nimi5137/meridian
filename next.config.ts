import type { NextConfig } from 'next';
const config: NextConfig = {
 reactStrictMode:true,
 serverExternalPackages:[],
 experimental:{serverActions:{bodySizeLimit:'6mb'}},
 async headers(){return [{source:'/settings/integrations/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'Referrer-Policy',value:'no-referrer'}]},{source:'/documents/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'}]}];},
};
export default config;
