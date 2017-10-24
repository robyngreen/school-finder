import SchoolMap from "../components/SchoolMap";
import Head from 'next/head';

export default () => (
  <div>
    <Head>
      <title>SchoolFinder</title>
      <meta charSet='utf-8' />
      <meta name='viewport' content='initial-scale=1.0, width=device-width' />
    </Head>
    <SchoolMap />
  </div>
);
