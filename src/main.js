
import 'isomorphic-fetch';
import 'es6-promise';

import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';

import N3 from "n3";

const DefaultN3Parser = N3.Parser();


const fetchRdfResource = (url,options) => {
  return fetch(url,options)
    .then(response => {
      if (response.ok) {
        return response;
      } else {
        var error = new Error(response.statusText);
        error.response = response;
        throw error;
      }
    })
    .then(response => response.text())
    .then(text => {
      const triples = DefaultN3Parser.parse(text);
      const store = N3.Store();
      store.addTriples(triples);
      return store;
    })
};

const typeDefs = `
  interface Resource {
    url: String!
    type: String!
  }
  
  type Person implements Resource {
    url: String!
    type: String!
    name: String
  }
  
  type Query {
    resource(url: String!): Resource
  }
`;

const resolvers = {
  Query: {
    resource: (obj,args) => {
      return fetchRdfResource(args.url)
        .then(store => {
          const triples = store.getTriples(args.url);
          console.log(store);
          console.log(triples);
          console.log(store.getTriples(args.url,"http://www.w3.org/1999/02/22-rdf-syntax-ns#type"));
          return {
            url: args.url,
            type: "Person",
            name: "PersonName",
          }
      });
    }
  },
  Resource: {
    __resolveType: (obj, context, info) => {
      if(obj.type === "Person"){
        return "Person";
      }
      return null;
    },
    url: resource => resource.url,
    type: resource => resource.type,
  },
  Person: {
    name: person => person.name,
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });




const PORT = 3000;

const app = express();

// bodyParser is needed just for POST.
app.use(
  '/graphql',
  bodyParser.json(),
  graphqlExpress({
    schema: schema,
    context: {  },
  })
);


app.get('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));


app.listen(PORT);