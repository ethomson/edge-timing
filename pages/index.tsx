import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';

const Home: NextPage = () => {
  const regions = [
    'arn1', 'bom1', 'cdg1', 'cle1', 'cpt1', 'dub1', 'fra1', 'gru1', 'hkg1',
    'hnd1', 'iad1', 'icn1', 'kix1', 'lhr1', 'pdx1', 'sfo1', 'sin1', 'syd1'
  ];

  const tests = [
    {
      'key': 'deno',
      'name': 'Deno Deploy',
    },
    {
      'key': 'vercel',
      'name': 'Vercel'
    }
  ];

  const results: any = [ ];

  regions.forEach((region: string) => {
    results[region] = { };

    tests.forEach((test) => {
      const [time, setTime] = useState('...');
      const [details, setDetails] = useState({ });
      const [detailsPosition, setDetailsPosition] = useState([ 0, 0 ]);

      results[region][test.key] = {
        'time': time,
        'setTime': setTime,

        'details': details,
        'setDetails': setDetails,

        'detailsPosition': detailsPosition,
        'setDetailsPosition': setDetailsPosition
      };
    });
  });

  const setFailure = (region: string, message: string) => {
    for (const [k, v] of Object.entries(results[region])) {
      (v as any).setTime(message);
    }
  };

  const round = (n: number) => {
    return n.toFixed(2);
  }

  const formatDetails = (region: string, test: any, v: any) => {
    if (!v || !v.time) {
      return ( <span>Loading...</span> );
    }

    return (
      <div>
        <div className={styles.resultsDetailsTitle}>
          <b>{test.name} from {region}</b>
        </div>

        <div>
          <b>Region:</b> {v.region}<br />
          <b>Time:</b><br />
          <span className={styles.resultsDetailsTimePrompt}>DNS:</span> {round(v.time.dns)}ms<br />
          <span className={styles.resultsDetailsTimePrompt}>Connect:</span> {round(v.time.connect)}ms<br />
          <span className={styles.resultsDetailsTimePrompt}>TLS:</span> {round(v.time.tls)}ms<br />
          <span className={styles.resultsDetailsTimePrompt}>TTFB:</span> {round(v.time.ttfb)}ms<br />
          <span className={styles.resultsDetailsTimePromptComplete}>Complete:</span> {round(v.time.complete)}ms<br />
        </div>
      </div>
    );
  }

  let count = 0;

  const loadRegions = async () => {
    regions.forEach((region: string) => {
      fetch(`https://edge-timing-${region}.vercel.app/api/timer`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`response from ${region}: ${response.status}`);
          }

          return response.json();
        })
        .then((data) => {
          for (const [k, v] of Object.entries(data)) {
            if (!results[region][k]) {
              return;
            }

            if (!(v as any).success) {
              results[region][k].setTime('fail');
              return;
            }

            results[region][k].setTime(round((v as any).time.complete));
            results[region][k].setDetails(v);
          }
        })
        .catch(rejected => {
          console.error(rejected)
          setFailure(region, 'fail');
          return;
        });
    });
  };

  useEffect(() => { loadRegions() }, []);

  const setDetailsPosition = (region: string, testKey: string, x: number, y: number) => {
    if (x || y) {
      results[region][testKey].setDetailsPosition([ x, y ]);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Edge Timing</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Edge Timing
        </h1>

        <table className={styles.results}>
          <thead>
            <tr>
              <th className={styles.resultsHeaderSectionBlank}></th>
              <th className={styles.resultsHeaderSection} colSpan={regions.length}>
                <h2>Simple Function</h2>
              </th>
            </tr>

            <tr>
              <th className={styles.resultsHeaderBlank}></th>
              { regions.map((region, idx) => { return ( <th key={region}>{region}</th> ); }) }
            </tr>
          </thead>
          <tbody>
            {
              tests.map((test, idx) => {
                return (
                  <tr key={test.key}>
                    <th key={test.key + '.' + 'header'}>{test.name}</th>
                    {
                      regions.map((region, idx) => {
                        return (
                          <td key={test.key + '.' + region}
                              onMouseMove={(e) => setDetailsPosition(region, test.key, e.clientX, e.clientY)}>
                            <span>
                              {
                                results[region][test.key].time
                              }
                            </span>
                            <div className={styles.resultsDetails}
                                 style={{
                                   left: results[region][test.key].detailsPosition[0],
                                   top: results[region][test.key].detailsPosition[1]
                                 }}>
                              {
                                formatDetails(region, test, results[region][test.key].details)
                              }
                            </div>
                          </td>
                        );
                      })
                    }
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
};

export default Home;
