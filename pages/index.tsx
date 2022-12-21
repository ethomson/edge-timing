import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useState, useEffect, useRef } from 'react';

const Home: NextPage = () => {
  const regions = [
    'arn1', 'bom1', 'cdg1', 'cle1', 'cpt1', 'dub1', 'fra1', 'gru1', 'hkg1',
    'hnd1', 'iad1', 'icn1', 'kix1', 'lhr1', 'pdx1', 'sfo1', 'sin1', 'syd1'
  ];

  const providers = [
    {
      'key': 'cloudflare',
      'name': 'Cloudflare',
    },
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

    providers.forEach((provider) => {
      const [time, setTime] = useState('...');
      const [details, setDetails] = useState({ });
      const [detailsPosition, setDetailsPosition] = useState([ 0, 0 ]);

      results[region][provider.key] = {
        'raw': [ ],

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

  const formatDetails = (region: string, provider: any, v: any) => {
    if (!v || !v.time) {
      return ( <span>Loading...</span> );
    }

    return (
      <div>
        <div className={styles.resultsDetailsTitle}>
          <b>{provider.name} from {region}</b>
        </div>

        <div>
          <b>Region:</b> {v.regions.join(', ')}<br />
        </div>
        <div>
          <b>Timing details (min / avg / max):</b><br />
          <span className={styles.resultsDetailsTimePrompt}>DNS:</span> {round(v.time.dns.min)} / {round(v.time.dns.average)} / {round(v.time.dns.max)} ms<br />
          <span className={styles.resultsDetailsTimePrompt}>Connect:</span> {round(v.time.connect.min)} / {round(v.time.connect.average)} / {round(v.time.connect.max)} ms<br />
          <span className={styles.resultsDetailsTimePrompt}>TLS:</span> {round(v.time.tls.min)} / {round(v.time.tls.average)} / {round(v.time.tls.max)} ms<br />
          <span className={styles.resultsDetailsTimePrompt}>TTFB:</span> {round(v.time.ttfb.min)} / {round(v.time.ttfb.average)} / {round(v.time.ttfb.max)} ms<br />
          <span className={styles.resultsDetailsTimePromptComplete}>Complete:</span> {round(v.time.complete.min)} / {round(v.time.complete.average)} / {round(v.time.complete.max)} ms<br />
        </div>
      </div>
    );
  }

  let count = 0;
  const regionsLoaded = useRef(false);

  const loadRegions = async () => {
    if (regionsLoaded.current) {
      return;
    }

    regionsLoaded.current = true;

    const promises = { };
    const runs = 10;

    regions.forEach((region: string) => {
      promises[region] = new Array();

      for (let i = 0; i < runs; i++) {
        promises[region].push(fetch(`https://edge-timing-${region}.vercel.app/api/timer`));
      }
    });

    regions.forEach((region: string) => {
      Promise.allSettled(Object.values(promises[region])).then((values) => {
        promises[region].forEach((promise) => {
          promise
            .then((response) => {
              if (!response.ok) {
                throw new Error(`response from ${region}: ${response.status}`);
              }

              return response.json();
            })
            .then((data) => {
              for (const [providerKey, providerData] of Object.entries(data)) {
                const providerRawResults = results[region][providerKey].raw;

                providerRawResults.push(providerData);

                if (providerRawResults.length >= runs) {
                  const regions = [ ];
                  let completedTotal = 0;

                  const details = {
                    regions: [ ],

                    time: {
                      dns:      { 'total': 0, 'min': Number.MAX_VALUE, 'max': 0 },
                      connect:  { 'total': 0, 'min': Number.MAX_VALUE, 'max': 0 },
                      tls:      { 'total': 0, 'min': Number.MAX_VALUE, 'max': 0 },
                      ttfb:     { 'total': 0, 'min': Number.MAX_VALUE, 'max': 0 },
                      complete: { 'total': 0, 'min': Number.MAX_VALUE, 'max': 0 }
                    }
                  };

                  providerRawResults.forEach((data) => {
                    details.regions.push(data.region);
                    console.log(data.time);

                    [ 'dns', 'connect', 'tls', 'ttfb', 'complete' ].forEach((t) => {
                      details.time[t].total += data.time[t];

                      if (data.time[t] > details.time[t].max) {
                        details.time[t].max = data.time[t];
                      }
                      if (data.time[t] < details.time[t].min) {
                        details.time[t].min = data.time[t];
                      }
                    });
                  });

                  [ 'dns', 'connect', 'tls', 'ttfb', 'complete' ].forEach((t) => {
                    details.time[t].average = details.time[t].total / providerRawResults.length;
                  });

                  details.regions = details.regions.filter((val, idx, arr) => arr.indexOf(val) === idx);

                  results[region][providerKey].setTime(round(details.time.complete.average));
                  results[region][providerKey].setDetails(details);
                }
              }
            })
        });
      });
    });
  };

  useEffect(() => { loadRegions() }, []);

  const setDetailsPosition = (region: string, providerKey: string, x: number, y: number) => {
    if (x || y) {
      results[region][providerKey].setDetailsPosition([ x, y ]);
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
              providers.map((provider, idx) => {
                return (
                  <tr key={provider.key}>
                    <th key={provider.key + '.' + 'header'}>{provider.name}</th>
                    {
                      regions.map((region, idx) => {
                        return (
                          <td key={provider.key + '.' + region}
                              onMouseMove={(e) => setDetailsPosition(region, provider.key, e.clientX, e.clientY)}>
                            <span>
                              {
                                results[region][provider.key].time
                              }
                            </span>
                            <div className={styles.resultsDetails}
                                 style={{
                                   left: results[region][provider.key].detailsPosition[0],
                                   top: results[region][provider.key].detailsPosition[1]
                                 }}>
                              {
                                formatDetails(region, provider, results[region][provider.key].details)
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
