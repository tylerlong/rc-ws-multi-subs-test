import RingCentral from '@rc-ex/core';
import WS from 'ws';
import hyperid from 'hyperid';

const uuid = hyperid();

const rc = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
});

const main = async () => {
  await rc.authorize({ jwt: process.env.RINGCENTRAL_JWT_TOKEN! });
  const r = await rc.post('/restapi/oauth/wstoken');
  const wsToken = r.data as { uri: string; ws_access_token: string };
  console.log(wsToken);

  const wsUri = `${wsToken.uri}?access_token=${wsToken.ws_access_token}`;
  const ws = new WS(wsUri);
  ws.addEventListener('message', (e) => {
    console.log(JSON.stringify(JSON.parse(e.data as string), null, 2));
  });

  const request = [
    {
      type: 'ClientRequest',
      messageId: uuid(),
      method: 'POST',
      path: '/restapi/v1.0/subscription',
    },
    {
      eventFilters: ['/restapi/v1.0/account/~/extension/~/message-store'],
      deliveryMode: {
        transportType: 'WebSocket',
      },
    },
  ];

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify(request));
    request[0].messageId = uuid();
    ws.send(JSON.stringify(request));
  });

  setInterval(() => {
    rc.restapi()
      .account()
      .extension()
      .companyPager()
      .post({
        from: { extensionId: rc.token?.owner_id },
        to: [{ extensionId: rc.token?.owner_id }],
        text: 'Hello world',
      });
  }, 10000);
};

main();
