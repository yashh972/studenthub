/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['pdf-parse'],
  outputFileTracingIncludes: {
    '/api/quizzes': ['./node_modules/pdf-parse/**/*'],
    '/api/flashcards': ['./node_modules/pdf-parse/**/*'],
  },
};

export default nextConfig;
