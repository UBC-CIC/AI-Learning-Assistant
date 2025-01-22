import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Fn } from 'aws-cdk-lib';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import * as cdk from "aws-cdk-lib";

export class VpcStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly vpcCidrString: string;
  public readonly privateSubnetsCidrStrings: string[];

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const existingVpcId: string = ''; //CHANGE IF DEPLOYING WITH EXISTING VPC

    if (existingVpcId != '') {
      //const publicSubnetCIDR = cdk.aws_ssm.StringParameter.valueFromLookup(this, 'public-subnet-cidr');
      //const AWSControlTowerStackSet = cdk.aws_ssm.StringParameter.valueFromLookup(this, 'ControlTowerStackSet');



      const AWSControlTowerStackSet = ""; //CHANGE TO YOUR CONTROL TOWER STACK SET
      const ailaPrefix = "AI-LEARNING-ASSISTANT-production";

      this.vpcCidrString = "172.31.96.0/20"; // CHANGE TO AVAILABLE CIDR RANGE IN EXISTING VPC 

      // VPC for application
      this.vpc = ec2.Vpc.fromVpcAttributes(this, `${id}-Vpc`, {
        vpcId: existingVpcId,
        availabilityZones: ["ca-central-1a", "ca-central-1b", "ca-central-1d"],
        privateSubnetIds: [
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet1AID`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet2AID`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet3AID`)
        ],
        privateSubnetRouteTableIds: [
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet1ARouteTable`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet2ARouteTable`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet3ARouteTable`)
        ],
        isolatedSubnetIds: [
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet1AID`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet2AID`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet3AID`)
        ],
        isolatedSubnetRouteTableIds: [
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet1ARouteTable`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet2ARouteTable`),
          Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet3ARouteTable`)
        ],
        vpcCidrBlock: Fn.importValue(`${AWSControlTowerStackSet}-VPCCIDR`),
      }) as ec2.Vpc;

      // Extract CIDR ranges from the private subnets
      this.privateSubnetsCidrStrings = [
        Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet1ACIDR`),
        Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet2ACIDR`),
        Fn.importValue(`${AWSControlTowerStackSet}-PrivateSubnet3ACIDR`),
      ];

      // Create a public subnet
      const publicSubnet = new ec2.Subnet(this, `PublicSubnet`, {
        vpcId: this.vpc.vpcId,
        availabilityZone: this.vpc.availabilityZones[0],
        cidrBlock: this.vpcCidrString,
        mapPublicIpOnLaunch: true,
      });


      // Retrieve Internet Gateway ID dynamically
      const internetGatewayIdResource = new AwsCustomResource(this, 'InternetGatewayIdResource', {
        onCreate: {
          service: 'EC2',
          action: 'describeInternetGateways',
          parameters: {
            Filters: [
              {
                Name: 'attachment.vpc-id',
                Values: [existingVpcId],
              },
            ],
          },
          physicalResourceId: {
            id: 'InternetGatewayIdResource',
          },
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
          resources: AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

      const internetGatewayId = internetGatewayIdResource.getResponseField('InternetGateways.0.InternetGatewayId');

      console.log(`Retrieved Internet Gateway ID`);

      if (!internetGatewayId) {
        const internetGateway = new ec2.CfnInternetGateway(this, `InternetGateway`, {});
        new ec2.CfnVPCGatewayAttachment(this, 'VPCGatewayAttachment', {
          vpcId: existingVpcId,
          internetGatewayId: internetGateway.ref,
        });
  
        console.log('Created a new Internet Gateway and attached it to the VPC');
      } else {
        console.log(`Existing Internet Gateway ID`);
      }

      // Retrieve NAT Gateway ID dynamically
      const natGatewayIdResource = new AwsCustomResource(this, 'NatGatewayIdResource', {
        onCreate: {
          service: 'EC2',
          action: 'describeNatGateways',
          parameters: {
            Filter: [
              {
                Name: 'vpc-id',
                Values: [existingVpcId],
              },
            ],
          },
          physicalResourceId: {
            id: 'NatGatewayIdResource',
          },
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
          resources: AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

      const natGatewayId = natGatewayIdResource.getResponseField('NatGateways.0.NatGatewayId');

      console.log(`Retrieved NAT Gateway ID:`);

      if (!natGatewayId) {
        // Create a new NAT Gateway if it doesn't exist
        const eip = new ec2.CfnEIP(this, 'EIP', {});
        const natGateway = new ec2.CfnNatGateway(this, `NatGateway`, {
          subnetId: publicSubnet.subnetId,
          allocationId: eip.attrAllocationId,
        });
  
        console.log('Created a new NAT Gateway in the public subnet');
      } else {
        console.log(`Existing NAT Gateway ID:`);
      }

      // Use the route table associated with the public subnet
      const publicRouteTableId = publicSubnet.routeTable.routeTableId;

      // Add a route to the Internet Gateway in the existing public route table
      new ec2.CfnRoute(this, `PublicRoute`, {
        routeTableId: publicRouteTableId,
        destinationCidrBlock: '0.0.0.0/0',
        gatewayId: internetGatewayId,
      });

      const createRouteIfNotExists = (routeTableId: string, destinationCidrBlock: string, natGatewayId: string) => {
        new AwsCustomResource(this, `${routeTableId}-RouteCreator`, {
          onCreate: {
            service: 'EC2',
            action: 'replaceRoute',
            parameters: {
              RouteTableId: routeTableId,
              DestinationCidrBlock: destinationCidrBlock,
              NatGatewayId: natGatewayId,
            },
            physicalResourceId: PhysicalResourceId.of(`${routeTableId}-${destinationCidrBlock}`), // Ensures idempotency
          },
          policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
        });
      };
      
      // Update route table for private subnets
      createRouteIfNotExists('rtb-05c671af07ddb1e3d', '0.0.0.0/0', natGatewayId); // Replace with actual Route Table ID for Private Subnet 1
      createRouteIfNotExists('rtb-07d69755b7dd2310a', '0.0.0.0/0', natGatewayId); // Replace with actual Route Table ID for Private Subnet 2
      createRouteIfNotExists('rtb-015a7fae3d76f0d83', '0.0.0.0/0', natGatewayId); // Replace with actual Route Table ID for Private Subnet 3
      
      // Add interface endpoints for private isolated subnets
      this.vpc.addInterfaceEndpoint('SSM Endpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        privateDnsEnabled: false, // Disable private DNS to avoid conflicts
      });

      this.vpc.addInterfaceEndpoint('Secrets Manager Endpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        privateDnsEnabled: false, // Disable private DNS to avoid conflicts
      });

      this.vpc.addInterfaceEndpoint('RDS Endpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.RDS,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        privateDnsEnabled: false, // Disable private DNS to avoid conflicts
      });

      this.vpc.addInterfaceEndpoint('Glue Endpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.GLUE,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        privateDnsEnabled: false, // Disable private DNS to avoid conflicts
      });

      this.vpc.addFlowLog(`${id}-vpcFlowLog`);

      // Get default security group for VPC
      const defaultSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        id,
        this.vpc.vpcDefaultSecurityGroup
      );

    } else {

      this.vpcCidrString = '10.0.0.0/16';

      const natGatewayProvider = ec2.NatProvider.gateway();

      // VPC for application
      this.vpc = new ec2.Vpc(this, "aila-Vpc", {
        //cidr: "10.0.0.0/16",
        ipAddresses: ec2.IpAddresses.cidr(this.vpcCidrString),
        natGatewayProvider: natGatewayProvider,
        natGateways: 1,
        maxAzs: 2,
        subnetConfiguration: [
          {
            name: "public-subnet-1",
            subnetType: ec2.SubnetType.PUBLIC,
          },
          {
            name: "private-subnet-1",
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
          {
            name: "isolated-subnet-1",
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          },
        ]
      });

      this.vpc.addFlowLog("aila-vpcFlowLog");

      // Get default security group for VPC
      const defaultSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        id,
        this.vpc.vpcDefaultSecurityGroup
      );

      // Add secrets manager endpoint to VPC
      this.vpc.addInterfaceEndpoint(`${id}-Secrets Manager Endpoint`, {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      });

      // Add RDS endpoint to VPC
      this.vpc.addInterfaceEndpoint(`${id}-RDS Endpoint`, {
        service: ec2.InterfaceVpcEndpointAwsService.RDS,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      });
    }
  }
}
