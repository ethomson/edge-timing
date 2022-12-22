import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useState, useEffect, useRef } from 'react';

// configuration

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

// lfg

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

const Home = () => {
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

        <ResultsTable results={results} />
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

const ResultsTable = (props) => {
  const results = props.results;

  return (
    <table className={styles.results}>
      <tbody>

        {
          tests.map((test) => {
            return (
              <TestResults test={test} results={results} />
            )
          })
        }
      </tbody>
    </table>
  )
};

const TestResults = (props) => {
  const test = props.test;
  const results = props.results;

  const regionsPerRow = props.regionsPerRow || 9;

  const regionGroups = [ regions ];

  while (regionGroups[regionGroups.length - 1].length > regionsPerRow) {
    regionGroups.push(regionGroups[regionGroups.length - 1].slice(regionsPerRow));
    regionGroups[regionGroups.length - 2] = regionGroups[regionGroups.length - 2].slice(0, regionsPerRow);
  }

  return (
    <>
      <tr>
        <th className={styles.resultsHeaderSectionBlank}></th>
        <th className={styles.resultsHeaderSection} colSpan={regionsPerRow}>
          <h2>{test.name}</h2>
        </th>
      </tr>

      {
        regionGroups.map((regionGroup, idx) => {
          return (
            <>
              <RegionHeaderRow index={idx} test={test} regions={regionGroup} />

              {
                providers.map((provider) => {
                  return ( <ProviderTestResultsRow test={test} regions={regionGroup} provider={provider} results={results} /> );
                })
              }
            </>
          );
        })
    }
  </>
  );
}

const RegionHeaderRow = (props) => {
  const index = props.index;
  const test = props.test;
  const regions = props.regions;

  return (
    <tr key={test + '.regions.' + index + '.header'}>
      <th key={test + '.regions.' + index + '.blank'} className={styles.resultsHeaderBlank}></th>
      {
        regions.map((region) => {
          return (
            <th key={test + '.regions.' + index + '.header.' + region}>
              {region}
            </th>
          );
        })
      }
    </tr>
  );
}

const ProviderTestResultsRow = (props) => {
  const test = props.test;
  const provider = props.provider;
  const regions = props.regions;
  const results = props.results;

  return (
    <tr key={test.key + '.' + provider.key}>
      <th key={test.key + '.' + provider.key + '.' + 'header'} className={styles.resultsProvider}>
        {provider.name}
      </th>

      {
        regions.map((region) => {
          const testResults = results[test.key][region][provider.key];

          return ( <ResultCell test={test} regions={regions} provider={provider} testResults={testResults} /> );
        })
      }

    </tr>
  );
}

const ResultCell = (props) => {
  const test = props.test;
  const provider = props.provider;
  const region = props.region;
  const testResults = props.testResults;

  const showDetails = () => {
    testResults.setDetailsHandler(setTimeout(() => {
      testResults.setDetailsVisible(true);
    }, 500));
  };

  const setDetailsPosition = (x, y) => {
    if (x || y) {
      testResults.setDetailsPosition([ x, y ]);
    }
  };

  const hideDetails = () => {
    testResults.setDetailsVisible(false);
    clearTimeout(testResults.detailsHandler);
  };

  return (
    <td key={provider.key + '.' + region}
        onMouseEnter={(e) => showDetails()}
        onMouseMove={(e) => setDetailsPosition(e.clientX, e.clientY)}
        onMouseLeave={(e) => hideDetails()}>
      <span>
        {
          testResults.time
        }
      </span>
      <div className={styles.resultsDetails}
           style={{
             display: testResults.detailsVisible ? 'block' : 'none',
             left: testResults.detailsPosition[0],
             top: testResults.detailsPosition[1]
           }}>
        {
          formatDetails(region, provider, testResults.details)
        }
      </div>
    </td>
  );
}

export default Home;
