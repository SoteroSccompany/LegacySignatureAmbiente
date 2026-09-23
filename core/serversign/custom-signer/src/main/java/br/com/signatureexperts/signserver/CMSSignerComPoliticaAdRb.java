package br.com.signatureexperts.signserver;

import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.operator.DigestCalculatorProvider;
import org.bouncycastle.operator.OperatorCreationException;
import org.signserver.module.cmssigner.CMSSigner;

/**
 * Mesmo {@link CMSSigner} da SignServer CE (mesma classpath, mesmo
 * CRYPTOTOKEN/certificado — nenhuma chave nova é envolvida), só
 * acrescentando o atributo assinado {@code SignaturePolicyIdentifier} da
 * Política de Assinatura AD-RB PAdES do ICP-Brasil no CMS gerado.
 *
 * Único ponto de extensão: {@link CMSSigner#createSignerInfoGeneratorBuilder}
 * é {@code protected}, chamado tanto por {@code signData} (fluxo normal)
 * quanto por {@code signHash} (client-side hashing, usado hoje pelo worker
 * CMSSignerCarimbo em produção). Chamamos o comportamento original via
 * {@code super} e só trocamos o gerador de atributos assinados — nenhum
 * outro método do CMSSigner é sobrescrito, nenhum atributo hoje existente
 * (content-type, message-digest, signing-certificate-v2) é removido.
 *
 * Ver serversign/custom-signer/README.md para o build e
 * docs/relatorios/sprint-selo-icp-worm-integridade.md (Leva 3 / L3.2) para
 * o registro completo desta mudança.
 */
public class CMSSignerComPoliticaAdRb extends CMSSigner {

    @Override
    protected JcaSignerInfoGeneratorBuilder createSignerInfoGeneratorBuilder(
            final DigestCalculatorProvider calc,
            final boolean directSignature) throws OperatorCreationException {
        final JcaSignerInfoGeneratorBuilder builder =
                super.createSignerInfoGeneratorBuilder(calc, directSignature);
        builder.setSignedAttributeGenerator(new PoliticaAdRbSignedAttributeTableGenerator());
        return builder;
    }
}
