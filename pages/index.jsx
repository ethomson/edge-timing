import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useState, useEffect, useRef } from 'react';

const Home = () => {
  const tests = [
    {
      'key': 'simple',
      'name': 'Simple Function',
      'url':  (region) => `https://edge-timing-${region}.vercel.app/api/timer`
    }
  ];

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

  const results = [ ];

  tests.forEach((test) => {
    results[test.key] = { };

    regions.forEach((region) => {
      results[test.key][region] = { };

      providers.forEach((provider) => {
        const [time, setTime] = useState('...');
        const [details, setDetails] = useState({ });
        const [detailsVisible, setDetailsVisible] = useState(false);
        const [detailsHandler, setDetailsHandler] = useState(null);
        const [detailsPosition, setDetailsPosition] = useState([ 0, 0 ]);

        results[test.key][region][provider.key] = {
          'raw': [ ],

          'time': time,
          'setTime': setTime,

          'details': details,
          'setDetails': setDetails,

          'detailsVisible': detailsVisible,
          'setDetailsVisible': setDetailsVisible,

          'detailsHandler': detailsHandler,
          'setDetailsHandler': setDetailsHandler,

          'detailsPosition': detailsPosition,
          'setDetailsPosition': setDetailsPosition
        };
      });
    });
  });

  const setFailure = (testKey, region, message) => {
    for (const [k, v] of Object.entries(results[testKey, region])) {
      v.setTime(message);
    }
  };

  const round = (n) => {
    return n.toFixed(2);
  }

  const formatDetails = (region, provider, v) => {
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
  const testsLoaded = useRef(false);

  const loadTests = async () => {
    if (testsLoaded.current) {
      return;
    }

    testsLoaded.current = true;

    const promises = { };
    const runs = 10;

    tests.forEach((test) => {
      promises[test.key] = { }

      regions.forEach((region) => {
        promises[test.key][region] = new Array();

        for (let i = 0; i < runs; i++) {
          promises[test.key][region].push(fetch(tests[0].url(region)));
        }
      });

      regions.forEach((region) => {
        Promise.allSettled(Object.values(promises[test.key][region])).then((values) => {
          promises[test.key][region].forEach((promise) => {
            promise
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`response from ${region}: ${response.status}`);
                }

                return response.json();
              })
              .then((data) => {
                for (const [providerKey, providerData] of Object.entries(data)) {
                  const providerRawResults = results[test.key][region][providerKey].raw;

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

                    results[test.key][region][providerKey].setTime(round(details.time.complete.average));
                    results[test.key][region][providerKey].setDetails(details);
                  }
                }
              })
              .catch((error) => {
                console.error(error);
                providers.forEach((provider) => {
                  results[test.key][region][provider.key].setTime("Fail");
                });
              });
          });
        });
      });
    });
  };

  useEffect(() => { loadTests() }, []);

  const showDetails = (testKey, region, providerKey, x, y) => {
    results[testKey][region][providerKey].setDetailsHandler(setTimeout(() => {
      results[testKey][region][providerKey].setDetailsVisible(true);
    }, 500));
  };

  const setDetailsPosition = (testKey, region, providerKey, x, y) => {
    if (x || y) {
      results[testKey][region][providerKey].setDetailsPosition([ x, y ]);
    }
  };

  const hideDetails = (testKey, region, providerKey, x, y) => {
    results[testKey][region][providerKey].setDetailsVisible(false);
    clearTimeout(results[testKey][region][providerKey].detailsHandler);
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
          <tbody>

            {
              tests.map((test) => {
                return ( <>
                  <tr>
                    <th className={styles.resultsHeaderSectionBlank}></th>
                    <th className={styles.resultsHeaderSection} colSpan={regions.length}>
                      <h2>{test.name}</h2>
                    </th>
                  </tr>

                  {
                    [
                      regions.slice(0, Math.ceil(regions.length / 2)),
                      regions.slice((Math.ceil(regions.length) / 2))
                    ].map((regions, idx) => {
                      return (
                        <>
                          <tr key={'regions.' + idx}>
                            <th className={styles.resultsHeaderBlank}></th>
                            { regions.map((region) => { return ( <th key={region}>{region}</th> ); }) }
                          </tr>

                          {
                            providers.map((provider) => {
                              return (
                                <tr key={provider.key}>
                                  <th key={provider.key + '.' + 'header'} className={styles.resultsProvider}>{provider.name}</th>

                                  {
                                    regions.map((region) => { return (
                                      <td key={provider.key + '.' + region}
                                          onMouseEnter={(e) => showDetails(test.key, region, provider.key, e.clientX, e.clientY)}
                                          onMouseMove={(e) => setDetailsPosition(test.key, region, provider.key, e.clientX, e.clientY)}
                                          onMouseLeave={(e) => hideDetails(test.key, region, provider.key, e.clientX, e.clientY)}>
                                        <span>
                                          {
                                            results[test.key][region][provider.key].time
                                          }
                                        </span>
                                        <div className={styles.resultsDetails}
                                             style={{
                                               display: results[test.key][region][provider.key].detailsVisible ? 'block' : 'none',
                                               left: results[test.key][region][provider.key].detailsPosition[0],
                                               top: results[test.key][region][provider.key].detailsPosition[1]
                                             }}>
                                          {
                                            formatDetails(region, provider, results[test.key][region][provider.key].details)
                                          }
                                        </div>
                                      </td>
                                    ) })
                                  }

                                </tr>
                              );
                            })
                          }
                        </>
                      );
                    })
                }
              </> ) })
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
