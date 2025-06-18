const http = require('http');

module.exports = function(RED) {
  function DISGUISENode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on('input', function(msg, send, done) {
      const ip = config.ipAddress || msg.ipAddress;
      const port = config.port || msg.port || 80;
      const path = "/api/session/status/health"; // ✅ fixed path

      if (!ip) {
        node.error("No IP address specified");
        done();
        return;
      }

      const options = {
        hostname: ip,
        port: parseInt(port, 10),
        path: path,
        method: 'GET',
      };

      node.log(`Requesting http://${ip}:${port}${path}`);

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          let fullJson;
          try {
            fullJson = JSON.parse(data);
          } catch (e) {
            node.error("Invalid JSON response", msg);
            done(e);
            return;
          }

          // Prepare outputs
          const output1 = { ...msg, payload: fullJson };
          const output2 = { ...msg, payload: null };
          const output3 = { ...msg, payload: null };

          try {
            const result = fullJson.result?.[0];
            if (result) {
              output2.payload = result.status?.averageFPS ?? null;
              output3.payload = result.machine?.hostname ?? null;
            }
          } catch (err) {
            node.warn("Could not extract FPS or Hostname from JSON");
          }

          send([output1, output2, output3]);
          done();
        });
      });

      req.on('error', (err) => {
        node.error("HTTP request failed: " + err.message, msg);
        done(err);
      });

      req.end();
    });
  }

  RED.nodes.registerType("DISGUISE-API", DISGUISENode);
};
